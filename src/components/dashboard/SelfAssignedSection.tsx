import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface SelfAssignedCourse {
  id: string;
  title: string;
  difficulty: string;
  progress_percentage: number;
  self_assigned_date: string;
}

export const SelfAssignedSection = () => {
  const { user } = useAuth();
  const [selfAssignedCourses, setSelfAssignedCourses] = useState<SelfAssignedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSelfAssignedCourses();
    }
  }, [user]);

  const fetchSelfAssignedCourses = async () => {
    if (!user) return;

    console.debug('[SelfAssigned] fetching self-assigned courses...', { userId: user.id });

    try {
      // For this demo, we'll consider courses enrolled by the user themselves as self-assigned
      // In a real implementation, you might have a separate field to track this
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
        .eq('courses.is_mandatory', false)
        .order('enrollment_date', { ascending: false })
        .limit(4);

      if (error) throw error;

      const processedCourses = enrollments?.map(enrollment => ({
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        difficulty: enrollment.courses.difficulty,
        progress_percentage: enrollment.progress_percentage,
        self_assigned_date: enrollment.enrollment_date,
      })) || [];

      console.debug('[SelfAssigned] loaded courses:', processedCourses.length);
      setSelfAssignedCourses(processedCourses);
    } catch (error: any) {
      console.error('[SelfAssigned] Error fetching self-assigned courses:', error);
      toast.error('Failed to load self-assigned courses');
    } finally {
      setLoading(false);
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
          <CardTitle>Self-Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
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
          <UserCheck className="h-5 w-5" />
          Self-Assigned
        </CardTitle>
        <CardDescription>
          Courses you've chosen to take
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selfAssignedCourses.length > 0 ? (
          <div className="space-y-4">
            {selfAssignedCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">{course.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {course.progress_percentage}% complete
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Started: {new Date(course.self_assigned_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to={`/courses/${course.id}`}>
                    Continue
                  </Link>
                </Button>
              </div>
            ))}
            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/courses">
                  <Plus className="h-4 w-4 mr-1" />
                  Add More Courses
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No self-assigned courses yet</p>
            <Button asChild>
              <Link to="/courses">
                <Plus className="h-4 w-4 mr-1" />
                Browse & Assign Courses
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};