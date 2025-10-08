import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Clock, 
  BookOpen, 
  Award,
  Calendar,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  estimated_duration_minutes: number;
  compliance_standard: string;
  training_type: string;
  expiry_period_months: number;
  level: string;
}

interface Enrollment {
  id: string;
  status: string;
}

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, category, estimated_duration_minutes, compliance_standard, training_type, expiry_period_months, level')
        .eq('id', id)
        .maybeSingle();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch enrollment status
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('user_course_enrollments')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle();

        setEnrollment(enrollmentData);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: id,
          status: 'enrolled',
        });

      if (error) throw error;

      toast.success('Successfully enrolled in course');
      fetchCourseDetails();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    navigate(`/courses/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
        <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/catalog">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Duration not set';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/catalog">Course Catalog</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Course Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">{course.title}</h1>
        
        <div className="flex flex-wrap gap-3">
          {course.category && (
            <Badge variant="secondary" className="text-sm">
              {course.category}
            </Badge>
          )}
          {course.level && (
            <Badge variant="outline" className="text-sm">
              Level: {course.level}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Course Card */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {course.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Course Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {course.estimated_duration_minutes && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDuration(course.estimated_duration_minutes)}
                  </p>
                </div>
              </div>
            )}

            {course.training_type && (
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Training Type</p>
                  <p className="text-sm text-muted-foreground">{course.training_type}</p>
                </div>
              </div>
            )}

            {course.compliance_standard && (
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Compliance Standard</p>
                  <p className="text-sm text-muted-foreground">{course.compliance_standard}</p>
                </div>
              </div>
            )}

            {course.expiry_period_months && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Certificate Validity</p>
                  <p className="text-sm text-muted-foreground">
                    {course.expiry_period_months} months
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enrollment Button */}
          <div className="pt-4 border-t">
            {enrollment ? (
              <Button 
                onClick={handleContinue} 
                size="lg" 
                className="w-full"
              >
                Continue Course
              </Button>
            ) : (
              <Button 
                onClick={handleEnroll} 
                size="lg" 
                className="w-full"
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Enroll'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseDetail;