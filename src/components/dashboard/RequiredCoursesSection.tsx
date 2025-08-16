import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface RequiredCourse {
  id: string;
  title: string;
  difficulty: string;
  progress_percentage: number;
  is_overdue: boolean;
  due_date?: string;
  enrollment_date: string;
}

export const RequiredCoursesSection = () => {
  const { user } = useAuth();
  const [requiredCourses, setRequiredCourses] = useState<RequiredCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequiredCourses();
    }
  }, [user]);

  const fetchRequiredCourses = async () => {
    if (!user) return;

    console.debug('[RequiredCourses] fetching required courses...', { userId: user.id });

    try {
      const { data: enrollments, error } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          progress_percentage,
          enrollment_date,
          courses (
            id,
            title,
            difficulty,
            is_mandatory
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'enrolled')
        .eq('courses.is_mandatory', true)
        .order('enrollment_date', { ascending: false });

      if (error) throw error;

      const processedCourses = enrollments?.map(enrollment => {
        const enrollmentDate = new Date(enrollment.enrollment_date);
        const dueDate = new Date(enrollmentDate);
        dueDate.setDate(dueDate.getDate() + 30); // 30 days to complete
        const isOverdue = new Date() > dueDate && enrollment.progress_percentage < 100;

        return {
          id: enrollment.courses.id,
          title: enrollment.courses.title,
          difficulty: enrollment.courses.difficulty,
          progress_percentage: enrollment.progress_percentage,
          is_overdue: isOverdue,
          due_date: dueDate.toISOString(),
          enrollment_date: enrollment.enrollment_date,
        };
      }) || [];

      console.debug('[RequiredCourses] loaded courses:', processedCourses.length);
      setRequiredCourses(processedCourses);
    } catch (error: any) {
      console.error('[RequiredCourses] Error fetching required courses:', error);
      toast.error('Failed to load required courses');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (courseId: string) => {
    if (!user) return;

    setSendingReminder(courseId);
    
    try {
      const { error } = await supabase.functions.invoke('send-reminder', {
        body: {
          user_id: user.id,
          course_id: courseId,
          reminder_type: 'overdue_course'
        }
      });

      if (error) throw error;

      toast.success('Reminder sent successfully');
    } catch (error: any) {
      console.error('[RequiredCourses] Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Required Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Required Courses
        </CardTitle>
        <CardDescription>
          Mandatory training that must be completed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requiredCourses.length > 0 ? (
          <div className="space-y-4">
            {requiredCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{course.title}</h3>
                    {course.is_overdue && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {course.progress_percentage}% complete
                    </span>
                    {course.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due: {new Date(course.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {course.is_overdue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendReminder(course.id)}
                      disabled={sendingReminder === course.id}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {sendingReminder === course.id ? 'Sending...' : 'Remind Me'}
                    </Button>
                  )}
                  <Button asChild>
                    <Link to={`/courses/${course.id}`}>
                      Continue
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No required courses assigned</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};