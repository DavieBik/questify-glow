import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface OptionalCourse {
  id: string;
  title: string;
  difficulty: string;
  progress_percentage: number;
  category?: string;
}

export const OptionalCoursesSection = () => {
  const { user } = useAuth();
  const [optionalCourses, setOptionalCourses] = useState<OptionalCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOptionalCourses();
    }
  }, [user]);

  const fetchOptionalCourses = async () => {
    if (!user) return;

    console.debug('[OptionalCourses] fetching optional courses...', { userId: user.id });

    try {
      const { data: enrollments, error } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          progress_percentage,
          courses (
            id,
            title,
            difficulty,
            category,
            is_mandatory
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'enrolled')
        .eq('courses.is_mandatory', false)
        .order('progress_percentage', { ascending: false })
        .limit(6);

      if (error) throw error;

      const processedCourses = enrollments?.map(enrollment => ({
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        difficulty: enrollment.courses.difficulty,
        progress_percentage: enrollment.progress_percentage,
        category: enrollment.courses.category,
      })) || [];

      console.debug('[OptionalCourses] loaded courses:', processedCourses.length);
      setOptionalCourses(processedCourses);
    } catch (error: any) {
      console.error('[OptionalCourses] Error fetching optional courses:', error);
      toast.error('Failed to load optional courses');
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
          <CardTitle>Optional Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
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
          <BookOpen className="h-5 w-5" />
          Optional Courses
        </CardTitle>
        <CardDescription>
          Additional learning opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {optionalCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionalCourses.map((course) => (
              <div key={course.id} className="p-4 border rounded-lg space-y-3">
                <div>
                  <h3 className="font-medium mb-2">{course.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    {course.category && (
                      <Badge variant="outline" className="text-xs">
                        {course.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {course.progress_percentage}% complete
                    </span>
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${course.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link to={`/courses/${course.id}`}>
                    Continue
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No optional courses enrolled</p>
            <Button asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};