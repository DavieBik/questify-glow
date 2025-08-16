import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, Edit, Trash2, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseCardSkeleton } from '@/components/ui/loading-skeleton';
import { CoursesEmptyState } from '@/components/ui/empty-state';
import { ManagerOrAdmin } from '@/components/auth/RoleGuard';
import { handleSupabaseError, withErrorHandling } from '@/utils/error-handling';

interface Course {
  id: string;
  title: string;
  description: string;
  short_description: string;
  difficulty: string;
  duration_minutes: number;
  estimated_duration_minutes: number;
  category: string;
  thumbnail_url: string;
  format: string;
  is_enrolled?: boolean;
}

const Courses = () => {
  const { canEdit, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    setError(null);
    const result = await withErrorHandling(async () => {
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
      return coursesData;
    });

    if (!result) {
      setError('Failed to load courses');
    }
    setLoading(false);
  };

  const enrollInCourse = async (courseId: string) => {
    await withErrorHandling(async () => {
      const { error } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user?.id,
          course_id: courseId,
        });

      if (error) throw error;

      toast.success('Successfully enrolled in course!');
      fetchCourses(); // Refresh to update enrollment status
    });
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || course.difficulty === difficultyFilter;
    const matchesFormat = formatFilter === 'all' || course.format === formatFilter;
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    return matchesSearch && matchesDifficulty && matchesFormat && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-accent/20 text-accent border-accent';
      case 'intermediate': return 'bg-primary/20 text-primary border-primary';
      case 'advanced': return 'bg-destructive/20 text-destructive border-destructive';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">
              Discover and enroll in courses to enhance your skills
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Discover and enroll in courses to enhance your skills
          </p>
        </div>
        <CoursesEmptyState 
          canCreate={canEdit}
          onCreateCourse={() => navigate('/admin/courses/create')}
        />
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
        <ManagerOrAdmin>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/admin/courses/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Link>
          </Button>
        </ManagerOrAdmin>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Disability Studies">Disability Studies</SelectItem>
            <SelectItem value="NDIS">NDIS</SelectItem>
            <SelectItem value="Communication">Communication</SelectItem>
            <SelectItem value="Personal Care">Personal Care</SelectItem>
            <SelectItem value="Community Support">Community Support</SelectItem>
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="instructor_led">Instructor Led</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>
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
          <CourseCard
            key={course.id}
            course={{
              id: course.id,
              title: course.title,
              description: course.short_description,
              difficulty: course.difficulty,
              category: course.category,
              estimated_duration_minutes: course.duration_minutes || course.estimated_duration_minutes,
              thumbnail_url: course.thumbnail_url
            }}
            enrollment={course.is_enrolled ? {
              progress_percentage: 0,
              status: 'enrolled'
            } : undefined}
          />
        ))}
      </div>

      {filteredCourses.length === 0 && courses.length === 0 && (
        <CoursesEmptyState 
          canCreate={canEdit}
          onCreateCourse={() => navigate('/admin/courses/create')}
        />
      )}

      {filteredCourses.length === 0 && courses.length > 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No courses found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Courses;