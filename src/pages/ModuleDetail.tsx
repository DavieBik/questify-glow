import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { 
  Clock, 
  Play,
  FileText,
  CheckCircle,
  Award,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface Module {
  id: string;
  title: string;
  description: string;
  body?: string;
  content_type: string;
  content_url: string;
  provider: 'storage' | 'youtube' | 'vimeo' | 'mux' | 'cloudflare';
  poster_url?: string;
  captions_url?: string;
  duration_seconds?: number;
  require_watch_pct?: number;
  is_required: boolean;
  pass_threshold_percentage: number;
  max_attempts: number;
  time_limit_minutes: number;
  course_id: string;
  courses: {
    title: string;
  };
}

interface Completion {
  id: string;
  status: string;
  score_percentage: number;
  attempt_number: number;
  completed_at: string;
  time_spent_minutes: number;
}

const ModuleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchModuleDetails();
    }
  }, [id, user]);

  const fetchModuleDetails = async () => {
    try {
      // Fetch module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq('id', id)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData as Module);

      // Fetch completion status
      if (user) {
        const { data: completionData } = await supabase
          .from('completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', id)
          .order('attempt_number', { ascending: false })
          .limit(1)
          .single();

        setCompletion(completionData);
      }
    } catch (error) {
      console.error('Error fetching module details:', error);
      toast.error('Failed to load module details');
    } finally {
      setLoading(false);
    }
  };

  const startModule = async () => {
    try {
      const attemptNumber = completion ? completion.attempt_number + 1 : 1;
      
      if (completion && attemptNumber > module?.max_attempts!) {
        toast.error(`Maximum attempts (${module?.max_attempts}) reached for this module`);
        return;
      }

      const { error } = await supabase
        .from('completions')
        .insert({
          user_id: user?.id,
          module_id: id,
          course_id: module?.course_id,
          attempt_number: attemptNumber,
          status: 'in_progress',
        });

      if (error) throw error;

      toast.success('Module started!');
      fetchModuleDetails(); // Refresh completion status
    } catch (error) {
      console.error('Error starting module:', error);
      toast.error('Failed to start module');
    }
  };

  const markModuleComplete = async () => {
    try {
      const { error } = await supabase
        .from('completions')
        .update({
          status: 'completed',
          score_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id)
        .eq('module_id', id)
        .eq('status', 'in_progress');

      if (error) throw error;

      toast.success('Module completed!');
      fetchModuleDetails(); // Refresh completion status
    } catch (error) {
      console.error('Error completing module:', error);
      toast.error('Failed to complete module');
    }
  };

  const renderContent = () => {
    const handleVideoProgress = (position: number, watchedPct: number) => {
      console.log(`Video progress: ${position}s (${Math.round(watchedPct * 100)}%)`);
    };

    const handleVideoComplete = async () => {
      toast.success('Video completed!');
      await markModuleComplete();
    };

    // Use VideoPlayer for video content
    if (module.content_type === 'video') {
      return (
        <VideoPlayer
          moduleId={module.id}
          provider={module.provider || 'storage'}
          contentUrl={module.content_url}
          posterUrl={module.poster_url}
          captionsUrl={module.captions_url}
          durationSeconds={module.duration_seconds}
          requireWatchPct={module.require_watch_pct}
          onProgress={handleVideoProgress}
          onComplete={handleVideoComplete}
        />
      );
    }
    
    if (module.content_type === 'scorm') {
      return (
        <div className="space-y-4">
          <div className="aspect-video">
            <iframe
              src={module.content_url}
              className="w-full h-full rounded-lg border"
              title={module.title}
            />
          </div>
          {completion?.status === 'in_progress' && (
            <div className="text-center">
              <Button onClick={markModuleComplete}>
                Mark as Complete
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (module.content_type === 'survey') {
      return (
        <div className="space-y-6">
          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Assessment Survey</h3>
            <div className="prose prose-sm max-w-none">
              {module.description && <p>{module.description}</p>}
              <div dangerouslySetInnerHTML={{ __html: module.body || '' }} />
            </div>
          </div>
          {completion?.status === 'in_progress' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Complete this assessment to finish the module
              </p>
              <Button onClick={markModuleComplete}>
                Complete Assessment
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (module.content_type === 'quiz') {
      // Process HTML content to make YouTube links clickable
      const processedContent = (module.body || '').replace(
        /YouTube – ([^(]+)\(([^)]+)\)/g,
        '<a href="https://www.youtube.com/results?search_query=$1" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">🎥 $1</a>'
      ).replace(
        /https:\/\/www\.vdwc\.vic\.gov\.au\/notifications/g,
        '<a href="https://www.vdwc.vic.gov.au/notifications" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">🔗 VDWC Notification page</a>'
      );

      return (
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
          </div>
        </div>
      );
    }
    
    // Default content renderer
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          This module contains {module.content_type} content.
        </p>
        {module.content_url ? (
          <Button asChild>
            <a href={module.content_url} target="_blank" rel="noopener noreferrer">
              Open Content
            </a>
          </Button>
        ) : (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: module.body || 'No content available.' }} />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Module Not Found</h2>
        <p className="text-muted-foreground mb-4">The module you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  const isCompleted = completion?.status === 'completed';
  const isPassed = completion?.score_percentage! >= module.pass_threshold_percentage;
  const canRetake = completion && completion.attempt_number < module.max_attempts && !isPassed;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="p-0 h-auto">
            <Link to={`/courses/${module.course_id}`} className="text-muted-foreground hover:text-foreground">
              ← Back to {module.courses.title}
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold">{module.title}</h1>
        {module.description && (
          <p className="text-muted-foreground max-w-2xl">{module.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Module Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Module Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!completion && (
                <Button onClick={startModule} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Start Module
                </Button>
              )}

              {completion && completion.status === 'in_progress' && (
                <div className="space-y-4">
                  {module.content_type === 'quiz' && (
                    <Button asChild className="w-full">
                      <Link to={`/modules/${module.id}/quiz`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Take Quiz
                      </Link>
                    </Button>
                  )}
                  
                  {module.content_type !== 'quiz' && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {module.content_type === 'video' && 'Watch the video above to complete this module'}
                        {module.content_type === 'scorm' && 'Interact with the SCORM package above to complete this module'}
                        {module.content_type === 'survey' && 'Complete the assessment form above to finish this module'}
                        {!['video', 'scorm', 'survey'].includes(module.content_type) && 'Complete the content above to finish this module'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isCompleted && (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-sm font-medium text-green-600">Module Completed!</p>
                  </div>
                  
                  {module.content_type === 'quiz' && (
                    <Button asChild className="w-full">
                      <Link to={`/modules/${module.id}/quiz`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Review Quiz
                      </Link>
                    </Button>
                  )}
                  
                  {canRetake && (
                    <Button variant="outline" onClick={startModule} className="w-full">
                      Retake Module
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Module Info */}
          <Card>
            <CardHeader>
              <CardTitle>Module Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Content Type</span>
                  <Badge variant="outline">{module.content_type}</Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required</span>
                  <span>{module.is_required ? 'Yes' : 'No'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pass Threshold</span>
                  <span>{module.pass_threshold_percentage}%</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Attempts</span>
                  <span>{module.max_attempts}</span>
                </div>
                
                {module.time_limit_minutes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time Limit</span>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {module.time_limit_minutes}min
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {completion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isCompleted && isPassed && <CheckCircle className="h-5 w-5 text-green-600" />}
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={isCompleted ? (isPassed ? 'default' : 'destructive') : 'secondary'}>
                      {completion.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Attempt</span>
                    <span>{completion.attempt_number}/{module.max_attempts}</span>
                  </div>
                  
                  {completion.score_percentage !== null && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Score</span>
                        <span>{completion.score_percentage}%</span>
                      </div>
                      <Progress 
                        value={completion.score_percentage} 
                        className={completion.score_percentage >= module.pass_threshold_percentage ? 'text-green-600' : 'text-red-600'}
                      />
                    </>
                  )}
                  
                  {completion.time_spent_minutes && (
                    <div className="flex justify-between text-sm">
                      <span>Time Spent</span>
                      <span>{completion.time_spent_minutes}min</span>
                    </div>
                  )}
                  
                  {completion.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>{new Date(completion.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleDetail;