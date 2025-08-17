import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';

interface ScormPackage {
  id: string;
  title: string;
  version: string;
  storage_path: string;
  entry_path?: string;
}

interface ScormSession {
  id: string;
  attempt: number;
  status: string;
  score: number;
  total_time: string | null;
  started_at: string | null;
  ended_at: string | null;
}

const ScormPlayer: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scormPackage, setScormPackage] = useState<ScormPackage | null>(null);
  const [session, setSession] = useState<ScormSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [packageUrl, setPackageUrl] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionDataRef = useRef<Record<string, any>>({});
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    if (packageId) {
      loadPackageAndSession();
    }
  }, [packageId]);

  const loadPackageAndSession = async () => {
    try {
      setLoading(true);

      // Load SCORM package details
      const { data: packageData, error: packageError } = await supabase
        .from('scorm_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;
      setScormPackage(packageData);

      // Use entry_path if available, otherwise fall back to index.html
      const entryPath = packageData.entry_path || 'index.html';
      const proxyUrl = `/api/scorm-proxy/${packageData.id}/${entryPath}`;
      setPackageUrl(proxyUrl);

      // Load or create session
      await loadOrCreateSession(packageData.id);

    } catch (error) {
      console.error('Error loading SCORM package:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SCORM package',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateSession = async (packageId: string) => {
    try {
      // Try to get existing session
      const { data: existingSession } = await supabase
        .from('scorm_sessions')
        .select('*')
        .eq('package_id', packageId)
        .eq('user_id', user?.id)
        .order('attempt', { ascending: false })
        .maybeSingle();

      if (existingSession && existingSession.status !== 'completed') {
        setSession({
          ...existingSession,
          total_time: existingSession.total_time?.toString() || '0',
          started_at: existingSession.started_at || '',
          ended_at: existingSession.ended_at || ''
        });
        sessionIdRef.current = existingSession.id;
        sessionDataRef.current = (existingSession.data as Record<string, any>) || {};
      } else {
        // Create new session
        const newAttempt = existingSession ? existingSession.attempt + 1 : 1;
        const { data: newSession, error } = await supabase
          .from('scorm_sessions')
          .insert({
            package_id: packageId,
            user_id: user?.id,
            attempt: newAttempt,
            status: 'not_started'
          })
          .select()
          .single();

        if (error) throw error;
        setSession({
          ...newSession,
          total_time: newSession.total_time?.toString() || '0',
          started_at: newSession.started_at || '',
          ended_at: newSession.ended_at || ''
        });
        sessionIdRef.current = newSession.id;
        sessionDataRef.current = {};
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: 'Error',
        description: 'Failed to load learning session',
        variant: 'destructive'
      });
    }
  };

  const startPackage = async () => {
    try {
      setIsPlaying(true);
      
      // Update session status
      const { error } = await supabase
        .from('scorm_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionIdRef.current);

      if (error) throw error;

      // Setup SCORM API in iframe
      setupScormAPI();

    } catch (error) {
      console.error('Error starting package:', error);
      toast({
        title: 'Error',
        description: 'Failed to start SCORM package',
        variant: 'destructive'
      });
    }
  };

  const setupScormAPI = () => {
    // Set up SCORM API on parent window (this window)
    // The iframe content will access these via window.parent.API due to same-origin proxy
    
    // SCORM 1.2 API
    const scormAPI = {
      LMSInitialize: (param: string) => {
        console.log('SCORM: LMSInitialize called');
        return 'true';
      },
      
      LMSFinish: (param: string) => {
        console.log('SCORM: LMSFinish called');
        updateSessionStatus('completed');
        return 'true';
      },
      
      LMSGetValue: (element: string) => {
        console.log('SCORM: LMSGetValue called for', element);
        return sessionDataRef.current[element] || '';
      },
      
      LMSSetValue: (element: string, value: string) => {
        console.log('SCORM: LMSSetValue called', element, value);
        sessionDataRef.current[element] = value;
        
        // Track important elements
        trackInteraction(element, value);
        
        // Update session data based on SCORM elements
        if (element === 'cmi.core.lesson_status') {
          updateSessionStatus(value);
        }
        if (element === 'cmi.core.score.raw') {
          updateSessionScore(parseFloat(value));
        }
        if (element === 'cmi.core.session_time') {
          // Convert SCORM time format to total minutes if needed
          // Format: PT[hours]H[minutes]M[seconds]S or HH:MM:SS
          sessionDataRef.current['session_time'] = value;
        }
        
        return 'true';
      },
      
      LMSCommit: (param: string) => {
        console.log('SCORM: LMSCommit called');
        saveSessionData();
        return 'true';
      },
      
      LMSGetLastError: () => '0',
      LMSGetErrorString: (errorCode: string) => '',
      LMSGetDiagnostic: (errorCode: string) => ''
    };

    // SCORM 2004 API (API_1484_11)
    const scorm2004API = {
      Initialize: (param: string) => scormAPI.LMSInitialize(param),
      Terminate: (param: string) => scormAPI.LMSFinish(param),
      GetValue: (element: string) => scormAPI.LMSGetValue(element),
      SetValue: (element: string, value: string) => scormAPI.LMSSetValue(element, value),
      Commit: (param: string) => scormAPI.LMSCommit(param),
      GetLastError: () => scormAPI.LMSGetLastError(),
      GetErrorString: (errorCode: string) => scormAPI.LMSGetErrorString(errorCode),
      GetDiagnostic: (errorCode: string) => scormAPI.LMSGetDiagnostic(errorCode)
    };

    // Attach APIs to parent window so iframe can access via window.parent.API
    (window as any).API = scormAPI;
    (window as any).API_1484_11 = scorm2004API;
    
    console.log('SCORM APIs attached to parent window - iframe can access via window.parent.API');
  };

  const trackInteraction = async (element: string, value: string) => {
    try {
      await supabase
        .from('scorm_interactions')
        .insert({
          session_id: sessionIdRef.current,
          element,
          value
        });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const updateSessionStatus = async (status: string) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.ended_at = new Date().toISOString();
      }

      await supabase
        .from('scorm_sessions')
        .update(updates)
        .eq('id', sessionIdRef.current);

      setSession(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Error updating session status:', error);
    }
  };

  const updateSessionScore = async (score: number) => {
    try {
      await supabase
        .from('scorm_sessions')
        .update({ score })
        .eq('id', sessionIdRef.current);

      setSession(prev => prev ? { ...prev, score } : null);
    } catch (error) {
      console.error('Error updating session score:', error);
    }
  };

  const saveSessionData = async () => {
    try {
      await supabase
        .from('scorm_sessions')
        .update({ 
          data: sessionDataRef.current,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionIdRef.current);
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  const resetAttempt = async () => {
    if (!scormPackage) return;
    
    try {
      await loadOrCreateSession(scormPackage.id);
      setIsPlaying(false);
      toast({
        title: 'New Attempt',
        description: 'Started a new attempt for this SCORM package'
      });
    } catch (error) {
      console.error('Error creating new attempt:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!scormPackage) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">SCORM package not found</p>
        <Button onClick={() => navigate('/courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{scormPackage.title}</h1>
          <p className="text-muted-foreground">
            SCORM {scormPackage.version} Package
          </p>
        </div>
      </div>

      {session && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{session.attempt}</div>
                <div className="text-sm text-muted-foreground">Attempt</div>
              </div>
              <div>
                <div className="text-2xl font-bold capitalize">{session.status}</div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {session.score ? `${session.score}%` : '-'}
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {session.total_time || '0:00'}
                </div>
                <div className="text-sm text-muted-foreground">Time Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SCORM Package</CardTitle>
            <div className="flex gap-2">
              {!isPlaying && (
                <Button onClick={startPackage}>
                  <Play className="h-4 w-4 mr-2" />
                  {session?.status === 'not_started' ? 'Start' : 'Resume'}
                </Button>
              )}
              {isPlaying && (
                <Button variant="outline" onClick={() => setIsPlaying(false)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button variant="outline" onClick={resetAttempt}>
                <RotateCcw className="h-4 w-4 mr-2" />
                New Attempt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPlaying && packageUrl ? (
            <div className="aspect-video border rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                src={packageUrl}
                className="w-full h-full"
                title={scormPackage.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                onLoad={() => {
                  console.log('SCORM iframe loaded via proxy - parent.API communication enabled');
                }}
              />
            </div>
          ) : (
            <div className="aspect-video border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Click Start to launch the SCORM package</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScormPlayer;