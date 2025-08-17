import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { withErrorHandling } from '@/utils/error-handling';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';

interface AssignedCourse {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  due_at: string | null;
  is_mandatory: boolean;
  difficulty: string;
}

export function MyAssignedCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignedCourses();
    }
  }, [user]);

  const fetchAssignedCourses = async () => {
    await withErrorHandling(async () => {
      const { data: enrollments, error } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          status,
          progress_percentage,
          due_at,
          courses!inner (
            id,
            title,
            is_mandatory,
            difficulty
          )
        `)
        .eq('user_id', user?.id)
        .order('due_at', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const formattedCourses: AssignedCourse[] = enrollments?.map(enrollment => ({
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        status: enrollment.status === 'completed' ? 'completed' as const : 
               enrollment.progress_percentage > 0 ? 'in_progress' as const : 'not_started' as const,
        progress_percentage: enrollment.progress_percentage,
        due_at: enrollment.due_at,
        is_mandatory: enrollment.courses.is_mandatory,
        difficulty: enrollment.courses.difficulty,
      })) || [];

      setCourses(formattedCourses);
    });
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-primary/20 text-primary border-primary/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <BookOpen className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, isOverdue: false };
    } else {
      return { text: date.toLocaleDateString(), isOverdue: false };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Assigned Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse p-4 border rounded-lg">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
          <BookOpen className="h-5 w-5 text-primary" />
          My Assigned Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses assigned"
            description="You don't have any assigned courses yet."
            action={{
              label: "Browse Available Courses",
              onClick: () => window.location.href = "/courses"
            }}
          />
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const dueInfo = formatDueDate(course.due_at);
              
              return (
                <div key={course.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(course.status)}
                        <h3 className="font-medium">{course.title}</h3>
                        {course.is_mandatory && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {getStatusBadge(course.status)}
                        
                        {course.status === 'in_progress' && (
                          <span>{course.progress_percentage}% complete</span>
                        )}
                        
                        {dueInfo && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className={dueInfo.isOverdue ? 'text-destructive font-medium' : ''}>
                              {dueInfo.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button asChild size="sm">
                      <Link to={`/courses/${course.id}`}>
                        {course.status === 'completed' ? 'Review' : 'Continue'}
                      </Link>
                    </Button>
                  </div>
                  
                  {course.status === 'in_progress' && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress_percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}