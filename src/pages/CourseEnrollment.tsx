import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { useToast, toast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  difficulty: string;
  category: string;
  estimated_duration_minutes: number;
}

export default function CourseEnrollment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check existing enrollment
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single();

        setEnrollment(enrollmentData);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast({ title: "Error", description: "Failed to load course details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canSelfEnroll = (course: Course) => {
    // Allow self-enrollment if course is mandatory (no cost) or meets other criteria
    return course.is_mandatory; // Add other criteria like cost check here
  };

  const handleSelfEnrollment = async () => {
    if (!user || !course) return;

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          status: 'enrolled'
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Error", description: "You are already enrolled in this course", variant: "destructive" });
          return;
        }
        throw error;
      }

      toast({ title: "Success", description: "Successfully enrolled in course!" });
      navigate(`/courses/${course.id}`);
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast({ title: "Error", description: "Failed to enrol in course", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!user || !course) return;

    setEnrolling(true);
    try {
      // Create pending enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          status: 'pending_approval'
        })
        .select()
        .single();

      if (enrollmentError) {
        if (enrollmentError.code === '23505') {
          toast({ title: "Error", description: "You have already requested enrollment for this course", variant: "destructive" });
          return;
        }
        throw enrollmentError;
      }

      // Send approval email to managers
      const { error: emailError } = await supabase.functions.invoke('send-enrollment-approval', {
        body: {
          userId: user.id,
          courseId: course.id,
          enrollmentId: enrollmentData.id,
          courseName: course.title
        }
      });

      if (emailError) {
        console.error('Error sending approval email:', emailError);
        // Don't fail the enrollment if email fails
      }

      toast({ title: "Success", description: "Enrollment request submitted! You will be notified when approved." });
      setEnrollment(enrollmentData);
    } catch (error) {
      console.error('Error requesting enrollment approval:', error);
      toast({ title: "Error", description: "Failed to submit enrollment request", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If already enrolled, redirect to course
  if (enrollment?.status === 'enrolled' || enrollment?.status === 'completed') {
    navigate(`/courses/${course.id}`);
    return null;
  }

  const selfEnrollAllowed = canSelfEnroll(course);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Link>
        </div>

        {/* Course Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                <CardDescription className="mt-2">{course.description}</CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={course.is_mandatory ? 'default' : 'secondary'}>
                  {course.is_mandatory ? 'Mandatory' : 'Optional'}
                </Badge>
                <Badge variant="outline">{course.difficulty}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {course.estimated_duration_minutes} minutes
              </div>
              <div>{course.category}</div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Status Card */}
        {enrollment?.status === 'pending_approval' ? (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-800">Approval Pending</CardTitle>
              </div>
              <CardDescription className="text-yellow-700">
                Your enrollment request has been submitted and is awaiting manager approval.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enrol in Course</CardTitle>
              <CardDescription>
                Choose how you'd like to enrol in this course.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selfEnrollAllowed ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-primary">Instant Enrollment Available</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      This course allows immediate enrollment. You can start learning right away.
                    </p>
                    <Button 
                      onClick={handleSelfEnrollment} 
                      disabled={enrolling}
                      className="w-full"
                    >
                      {enrolling ? 'Enrolling...' : 'Enrol Now'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Manager Approval Required</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      This course requires manager approval before you can start. We'll send a request to your manager.
                    </p>
                    <Button 
                      onClick={handleRequestApproval} 
                      disabled={enrolling}
                      variant="outline"
                      className="w-full"
                    >
                      {enrolling ? 'Submitting...' : 'Request Enrollment Approval'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}