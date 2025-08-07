import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, ExternalLink, Users, UserCheck, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Session {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  join_url: string;
  course_id: string;
  courses: {
    title: string;
  };
}

interface RsvpData {
  status: string;
  rsvp_count: number;
}

const SessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [rsvpData, setRsvpData] = useState<RsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (sessionId && user) {
      fetchSessionDetails();
    }
  }, [sessionId, user]);

  const fetchSessionDetails = async () => {
    if (!sessionId || !user) return;

    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          *,
          courses(title)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch RSVP count and user's RSVP status
      const { data: rsvpCount, error: rsvpCountError } = await supabase
        .from('session_rsvps')
        .select('status')
        .eq('session_id', sessionId);

      if (rsvpCountError) throw rsvpCountError;

      const { data: userRsvp, error: userRsvpError } = await supabase
        .from('session_rsvps')
        .select('status')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRsvpError) throw userRsvpError;

      setRsvpData({
        status: userRsvp?.status || '',
        rsvp_count: rsvpCount?.length || 0
      });
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast({
        title: "Error",
        description: "Failed to load session details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async () => {
    if (!sessionId || !user) return;

    setRsvpLoading(true);
    try {
      if (rsvpData?.status) {
        // Remove RSVP
        const { error } = await supabase
          .from('session_rsvps')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', user.id);

        if (error) throw error;

        setRsvpData(prev => prev ? {
          ...prev,
          status: '',
          rsvp_count: Math.max(0, prev.rsvp_count - 1)
        } : null);

        toast({
          title: "Success",
          description: "Your RSVP has been cancelled.",
        });
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('session_rsvps')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            status: 'attending'
          });

        if (error) throw error;

        setRsvpData(prev => prev ? {
          ...prev,
          status: 'attending',
          rsvp_count: prev.rsvp_count + 1
        } : null);

        toast({
          title: "Success",
          description: "You've successfully registered for this session!",
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRsvpLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = () => {
    if (!session) return '';
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const isUpcoming = () => {
    if (!session) return false;
    return new Date(session.start_time) > new Date();
  };

  const isPast = () => {
    if (!session) return false;
    return new Date(session.end_time) < new Date();
  };

  const isLive = () => {
    if (!session) return false;
    const now = new Date();
    return new Date(session.start_time) <= now && now <= new Date(session.end_time);
  };

  const getSessionStatus = () => {
    if (isPast()) return { label: 'Past', variant: 'secondary' as const };
    if (isLive()) return { label: 'Live', variant: 'destructive' as const };
    return { label: 'Upcoming', variant: 'default' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <p className="text-muted-foreground">The requested session could not be found.</p>
        </div>
      </div>
    );
  }

  const status = getSessionStatus();
  const canJoin = (isLive() || isUpcoming()) && session.join_url;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to={`/courses/${session.course_id}/sessions`}
          className="flex items-center text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sessions
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl">{session.title}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Session for <Link 
                      to={`/courses/${session.course_id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {session.courses.title}
                    </Link>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {session.description && (
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {session.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Frame (if live or has join URL) */}
          {canJoin && isLive() && (
            <Card>
              <CardHeader>
                <CardTitle>Live Session</CardTitle>
                <CardDescription>
                  The session is currently live. Join now to participate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Click the button below to join the live session
                    </p>
                    <Button size="lg" onClick={() => window.open(session.join_url, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Live Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">{formatDate(session.start_time)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{getDuration()}</span>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>{rsvpData?.rsvp_count || 0} registered</span>
              </div>
            </CardContent>
          </Card>

          {/* RSVP Card */}
          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rsvpData?.status ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <UserCheck className="h-4 w-4" />
                    <span className="font-medium">You're registered!</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleRsvp} 
                    disabled={rsvpLoading}
                    className="w-full"
                  >
                    {rsvpLoading ? 'Cancelling...' : 'Cancel Registration'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Register to receive session updates and access links.
                  </p>
                  <Button 
                    onClick={handleRsvp} 
                    disabled={rsvpLoading || isPast()}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {rsvpLoading ? 'Registering...' : 'Register for Session'}
                  </Button>
                </div>
              )}

              {canJoin && (
                <div className="pt-2 border-t">
                  <Button 
                    variant="secondary"
                    onClick={() => window.open(session.join_url, '_blank')}
                    className={`w-full ${isLive() ? 'animate-pulse bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {isLive() ? 'Join Now' : 'Join Session'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;