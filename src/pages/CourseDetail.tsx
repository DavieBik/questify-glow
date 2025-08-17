import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Users, 
  BookOpen, 
  Edit, 
  Video,
  FileText,
  CheckCircle,
  Circle
} from 'lucide-react';
import { toast } from 'sonner';

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
  video_url: string;
  format: string;
  is_mandatory: boolean;
  ndis_compliant: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  body: string;
  content_url: string;
  order_index: number;
  content_type: string;
  is_required: boolean;
  pass_threshold_percentage: number;
  max_attempts: number;
  time_limit_minutes: number;
  is_completed?: boolean;
}

interface Enrollment {
  id: string;
  progress_percentage: number;
  status: string;
}

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { canEdit, user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

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
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Check module completion status
      if (user && modulesData) {
        const { data: completions } = await supabase
          .from('completions')
          .select('module_id')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
        
        const modulesWithCompletion = modulesData.map(module => ({
          ...module,
          is_completed: completedModuleIds.has(module.id),
        }));

        setModules(modulesWithCompletion);
      } else {
        setModules(modulesData || []);
      }

      // Fetch enrollment status
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
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const redirectToEnrollment = () => {
    navigate(`/courses/${id}/enroll`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-primary/20 text-primary-foreground';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'quiz': return <FileText className="h-4 w-4" />;
      case 'scorm': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'online': return 'Online';
      case 'instructor_led': return 'Instructor Led';
      case 'external': return 'External';
      default: return format;
    }
  };

  const handleLaunchModule = (module: Module) => {
    if (module.content_type === 'scorm') {
      // Navigate to SCORM player if it's a SCORM module
      navigate(`/scorm/${module.id}/play`);
    } else if (module.content_url) {
      window.open(module.content_url, '_blank');
    }
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
          <Link to="/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="p-0 h-auto">
              <Link to="/courses" className="text-muted-foreground hover:text-foreground">
                ← Back to Courses
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground max-w-2xl">{course.short_description}</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link to={`/courses/${course.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Course
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty}
                  </Badge>
                </div>
                {(course.duration_minutes || course.estimated_duration_minutes) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {Math.round((course.duration_minutes || course.estimated_duration_minutes) / 60)} hours
                  </div>
                )}
                {course.category && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {course.category}
                  </div>
                )}
                {course.format && (
                  <Badge variant="secondary">
                    {getFormatBadge(course.format)}
                  </Badge>
                )}
              </div>
              
              {course.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{course.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                {course.is_mandatory && (
                  <Badge variant="outline">Mandatory</Badge>
                )}
                {course.ndis_compliant && (
                  <Badge variant="outline">NDIS Compliant</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
              <CardDescription>
                Complete all modules to finish the course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {module.is_completed ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(module.content_type)}
                          <h4 className="font-medium">{module.title}</h4>
                          {module.is_required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {module.body && (
                          <p className="text-sm text-muted-foreground">{module.body}</p>
                        )}
                        {module.description && (
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Pass: {module.pass_threshold_percentage}%</span>
                          <span>Max attempts: {module.max_attempts}</span>
                          {module.time_limit_minutes && (
                            <span>Time limit: {module.time_limit_minutes}min</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {enrollment && (
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/modules/${module.id}`}>
                            {module.is_completed ? 'Review' : 'Start'}
                          </Link>
                        </Button>
                        {module.content_url && (
                          <Button 
                            size="sm" 
                            onClick={() => handleLaunchModule(module)}
                          >
                            Launch
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Card */}
          <Card>
            <CardHeader>
              <CardTitle>Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollment ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{enrollment.progress_percentage}%</span>
                    </div>
                    <Progress value={enrollment.progress_percentage} />
                  </div>
                  <Badge variant="outline">
                    Status: {enrollment.status}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You are not enrolled in this course yet.
                  </p>
                  <Button onClick={redirectToEnrollment} className="w-full">
                    Enrol Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Modules</span>
                <span className="text-sm font-medium">{modules.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Required Modules</span>
                <span className="text-sm font-medium">
                  {modules.filter(m => m.is_required).length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-medium">
                  {modules.filter(m => m.is_completed).length}/{modules.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;