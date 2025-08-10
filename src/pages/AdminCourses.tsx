import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Plus, Edit, Eye, Users, Upload } from 'lucide-react';
import { ContentImportDialog } from '@/components/content/ContentImportDialog';

interface Course {
  id: string;
  title: string;
  description: string;
  short_description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  is_mandatory: boolean;
  is_active: boolean;
  category: string;
  created_at: string;
  enrollments?: number;
}

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          user_course_enrollments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coursesWithEnrollments = data?.map(course => ({
        ...course,
        enrollments: course.user_course_enrollments?.[0]?.count || 0
      })) || [];

      setCourses(coursesWithEnrollments);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseStatus = async (courseId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: isActive })
        .eq('id', courseId);

      if (error) throw error;

      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_active: isActive }
          : course
      ));

      toast({
        title: "Success",
        description: `Course ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating course status:', error);
      toast({
        title: "Error",
        description: "Failed to update course status",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'advanced': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
          <p className="text-muted-foreground">
            Manage and organize learning courses for your platform.
          </p>
        </div>
          <div className="flex gap-2">
            <ContentImportDialog
              trigger={
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Content
                </Button>
              }
              onImportComplete={fetchCourses}
            />
            <Button asChild>
              <Link to="/admin/courses/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Link>
            </Button>
          </div>
      </div>

      {/* Course Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.filter(c => c.is_mandatory).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, course) => sum + (course.enrollments || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <div className="grid gap-4">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>
                    {course.short_description || course.description}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={course.is_active}
                    onCheckedChange={(checked) => toggleCourseStatus(course.id, checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {course.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty}
                  </Badge>
                  {course.is_mandatory && (
                    <Badge variant="secondary">Mandatory</Badge>
                  )}
                  {course.category && (
                    <Badge variant="outline">{course.category}</Badge>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {course.enrollments || 0} enrolled
                  </div>
                  {course.estimated_duration_minutes && (
                    <div className="text-sm text-muted-foreground">
                      {Math.round(course.estimated_duration_minutes / 60)}h duration
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/courses/${course.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/courses/${course.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No courses available</p>
            <Button asChild>
              <Link to="/admin/courses/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCourses;