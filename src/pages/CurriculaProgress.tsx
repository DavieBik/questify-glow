import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Clock, Calendar, BookOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface CurriculumAssignment {
  id: string;
  status: string;
  assigned_at: string;
  due_at: string | null;
  curriculum: {
    id: string;
    name: string;
    description: string;
  };
  progress_percentage: number;
  completed_courses: number;
  total_courses: number;
  course_items: Array<{
    id: string;
    position: number;
    due_days_offset: number | null;
    course: {
      id: string;
      title: string;
      description: string;
      duration_minutes: number;
      category: string;
    };
    enrollment: {
      id: string;
      status: string;
      progress_percentage: number;
      due_at: string | null;
    } | null;
  }>;
}

const CurriculaProgress = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<CurriculumAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurriculumAssignments();
    }
  }, [user]);

  const fetchCurriculumAssignments = async () => {
    try {
      // First, get curriculum assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('curriculum_assignments')
        .select(`
          id,
          status,
          assigned_at,
          due_at,
          curricula!inner (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // For each assignment, get curriculum items and enrollment status
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          // Get curriculum items with course details
          const { data: itemsData, error: itemsError } = await supabase
            .from('curriculum_items')
            .select(`
              id,
              position,
              due_days_offset,
              courses!inner (
                id,
                title,
                description,
                duration_minutes,
                category
              )
            `)
            .eq('curriculum_id', assignment.curricula.id)
            .order('position');

          if (itemsError) throw itemsError;

          // Get enrollment status for each course
          const courseIds = itemsData?.map(item => item.courses.id) || [];
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('user_course_enrollments')
            .select('course_id, id, status, progress_percentage, due_at')
            .eq('user_id', user?.id)
            .in('course_id', courseIds);

          if (enrollmentsError) throw enrollmentsError;

          // Map enrollments to items
          const courseItems = itemsData?.map(item => {
            const enrollment = enrollmentsData?.find(e => e.course_id === item.courses.id);
            return {
              ...item,
              course: item.courses,
              enrollment: enrollment || null
            };
          }) || [];

          // Calculate progress
          const completedCourses = courseItems.filter(item => item.enrollment?.status === 'completed').length;
          const totalCourses = courseItems.length;
          const progressPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

          return {
            ...assignment,
            curriculum: assignment.curricula,
            course_items: courseItems,
            progress_percentage: progressPercentage,
            completed_courses: completedCourses,
            total_courses: totalCourses
          };
        })
      );

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error('Error fetching curriculum assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load curriculum assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>;
      case 'assigned':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Assigned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEnrollmentStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'in_progress':
        return <Circle className="h-5 w-5 text-blue-600 fill-current" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Duration not set';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Learning Paths</h1>
        <p className="text-muted-foreground">
          Track your progress through assigned curricula
        </p>
      </div>

      {/* Assignments */}
      <div className="space-y-6">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(assignment.status)}
                    {assignment.due_at && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Due {new Date(assignment.due_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{assignment.curriculum.name}</CardTitle>
                  {assignment.curriculum.description && (
                    <CardDescription>{assignment.curriculum.description}</CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{assignment.progress_percentage}%</div>
                  <div className="text-sm text-muted-foreground">
                    {assignment.completed_courses} of {assignment.total_courses} completed
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <Progress value={assignment.progress_percentage} className="h-3" />
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course Checklist
                </h4>
                
                <div className="space-y-3">
                  {assignment.course_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getEnrollmentStatusIcon(item.enrollment?.status)}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">{item.course.title}</h5>
                            {item.enrollment?.status === 'completed' && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                                Completed
                              </Badge>
                            )}
                          </div>
                          {item.course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(item.course.duration_minutes)}
                            </span>
                            {item.course.category && (
                              <span>{item.course.category}</span>
                            )}
                            {item.enrollment?.due_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due {new Date(item.enrollment.due_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {item.enrollment && item.enrollment.status !== 'completed' && item.enrollment.progress_percentage > 0 && (
                            <div className="mt-2">
                              <Progress value={item.enrollment.progress_percentage} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {item.enrollment ? (
                          <Button asChild size="sm" variant={item.enrollment.status === 'completed' ? 'outline' : 'default'}>
                            <Link to={`/courses/${item.course.id}`}>
                              {item.enrollment.status === 'completed' ? 'Review' : 'Continue'}
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm">
                            <Link to={`/courses/${item.course.id}`}>
                              Start
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {assignment.course_items.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No courses in this curriculum
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Curricula Assigned</h3>
          <p className="text-muted-foreground mb-4">
            You haven't been assigned any learning curricula yet.
          </p>
          <Button asChild>
            <Link to="/courses">
              Browse Available Courses
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default CurriculaProgress;