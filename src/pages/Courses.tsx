import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, Edit, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  short_description: string;
  difficulty: string;
  estimated_duration_minutes: number;
  category: string;
  thumbnail_url: string;
  is_enrolled?: boolean;
}

const Courses = () => {
  const { canEdit, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check enrollment status for each course
      if (user && coursesData) {
        const { data: enrollments } = await supabase
          .from('user_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id);

        const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);
        
        const coursesWithEnrollment = coursesData.map(course => ({
          ...course,
          is_enrolled: enrolledCourseIds.has(course.id),
        }));

        setCourses(coursesWithEnrollment);
      } else {
        setCourses(coursesData || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user?.id,
          course_id: courseId,
        });

      if (error) throw error;

      toast.success('Successfully enrolled in course!');
      fetchCourses(); // Refresh to update enrollment status
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error('Failed to enroll in course');
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || course.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

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
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Discover and enroll in courses to enhance your skills
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link to="/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    {course.estimated_duration_minutes && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.round(course.estimated_duration_minutes / 60)}h
                      </div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/courses/${course.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <CardDescription className="flex-1 mb-4">
                {course.short_description}
              </CardDescription>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/courses/${course.id}`}>
                    View Details
                  </Link>
                </Button>
                {!course.is_enrolled && (
                  <Button 
                    variant="outline"
                    onClick={() => enrollInCourse(course.id)}
                  >
                    Enroll
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No courses found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Courses;