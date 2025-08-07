import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink, Download, Users } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  join_url: string;
  created_at: string;
  rsvp_count?: number;
  user_rsvp?: string;
}

interface Course {
  id: string;
  title: string;
}

const CourseSessions: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseAndSessions();
    }
  }, [courseId, user]);

  const fetchCourseAndSessions = async () => {
    if (!courseId || !user) return;

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch sessions for this course
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          session_rsvps(count)
        `)
        .eq('course_id', courseId)
        .order('start_time', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch user's RSVPs
      const { data: userRsvps, error: rsvpError } = await supabase
        .from('session_rsvps')
        .select('session_id, status')
        .eq('user_id', user.id);

      if (rsvpError) throw rsvpError;

      const rsvpMap = new Map(userRsvps?.map(rsvp => [rsvp.session_id, rsvp.status]) || []);

      const sessionsWithRsvp = sessionsData?.map(session => ({
        ...session,
        rsvp_count: session.session_rsvps?.[0]?.count || 0,
        user_rsvp: rsvpMap.get(session.id)
      })) || [];

      setSessions(sessionsWithRsvp);
    } catch (error) {
      console.error('Error fetching course and sessions:', error);
    } finally {
      setLoading(false);
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

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isPast = (endTime: string) => {
    return new Date(endTime) < new Date();
  };

  const isLive = (startTime: string, endTime: string) => {
    const now = new Date();
    return new Date(startTime) <= now && now <= new Date(endTime);
  };

  const getSessionStatus = (startTime: string, endTime: string) => {
    if (isPast(endTime)) return { label: 'Past', variant: 'secondary' as const };
    if (isLive(startTime, endTime)) return { label: 'Live', variant: 'destructive' as const };
    return { label: 'Upcoming', variant: 'default' as const };
  };

  const generateIcsFile = (session: Session) => {
    const startDate = new Date(session.start_time);
    const endDate = new Date(session.end_time);
    
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SkillBridge LMS//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${session.description || ''}${session.join_url ? `\\n\\nJoin URL: ${session.join_url}` : ''}`,
      `UID:session-${session.id}@skillbridge.com`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <p className="text-muted-foreground">The requested course could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Sessions</h1>
        <p className="text-muted-foreground mt-2">{course.title}</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sessions Scheduled</h3>
            <p className="text-muted-foreground">
              Check back later for upcoming live sessions for this course.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sessions.map((session) => {
            const status = getSessionStatus(session.start_time, session.end_time);
            const canJoin = isLive(session.start_time, session.end_time) || isUpcoming(session.start_time);
            
            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{session.title}</CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      {session.description && (
                        <CardDescription className="text-base mb-4">
                          {session.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(session.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{session.rsvp_count} registered</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link to={`/sessions/${session.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>

                    {canJoin && session.join_url && (
                      <Button 
                        size="sm"
                        onClick={() => window.open(session.join_url, '_blank')}
                        className={isLive(session.start_time, session.end_time) ? 'animate-pulse' : ''}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {isLive(session.start_time, session.end_time) ? 'Join Now' : 'Join Session'}
                      </Button>
                    )}

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateIcsFile(session)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>

                  {session.user_rsvp && (
                    <div className="text-sm text-muted-foreground">
                      You're registered for this session
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Link 
          to={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to Course
        </Link>
      </div>
    </div>
  );
};

export default CourseSessions;