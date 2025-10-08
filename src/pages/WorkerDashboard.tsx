import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Award, Clock, TrendingUp, User, Target, CheckCircle, PlayCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MyCertificatesTab } from '@/components/certificates/MyCertificatesTab';
import { format, addMonths } from 'date-fns';

interface WorkerStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalHours: number;
}

interface CourseEnrollment {
  id: string;
  course_id: string;
  status: string;
  enrollment_date: string;
  course: {
    title: string;
    difficulty: string;
    category: string;
    expiry_period_months: number | null;
  };
  completions: Array<{
    completed_at: string | null;
    time_spent_minutes: number | null;
  }>;
  modules_completed: number;
  total_modules: number;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkerStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalHours: 0,
  });
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWorkerData();
    }
  }, [user]);

  const fetchWorkerData = async () => {
    setLoading(true);
    try {
      // Fetch enrollments with course details
      const { data: enrollmentsData } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          course_id,
          status,
          enrollment_date,
          course:courses(title, difficulty, category, expiry_period_months)
        `)
        .eq('user_id', user?.id)
        .order('enrollment_date', { ascending: false });

      // Fetch all completions for user
      const { data: allCompletions } = await supabase
        .from('completions')
        .select('course_id, module_id, completed_at, time_spent_minutes, status')
        .eq('user_id', user?.id);

      // Enrich enrollments with progress data
      const enrichedEnrollments = await Promise.all(
        (enrollmentsData || []).map(async (enrollment) => {
          const { data: modules } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', enrollment.course_id);

          const courseCompletions = allCompletions?.filter(c => c.course_id === enrollment.course_id && c.status === 'completed') || [];

          return {
            ...enrollment,
            total_modules: modules?.length || 0,
            modules_completed: courseCompletions.length,
            completions: courseCompletions.map(c => ({
              completed_at: c.completed_at,
              time_spent_minutes: c.time_spent_minutes,
            })),
          };
        })
      );

      // Sort enrollments to show "Getting Started with Skillbridge" first if no other active courses
      const sortedEnrollments = enrichedEnrollments.sort((a, b) => {
        const aIsOnboarding = a.course.title === 'Getting Started with Skillbridge';
        const bIsOnboarding = b.course.title === 'Getting Started with Skillbridge';
        const aIsIncomplete = a.status !== 'completed';
        const bIsIncomplete = b.status !== 'completed';
        
        // If only one course is enrolled and it's incomplete, show onboarding first
        if (enrichedEnrollments.length === 1 && aIsOnboarding && aIsIncomplete) return -1;
        
        // If onboarding is incomplete and there are no other incomplete courses, show it first
        const otherIncompleteCourses = enrichedEnrollments.filter(e => 
          e.course.title !== 'Getting Started with Skillbridge' && e.status !== 'completed'
        );
        
        if (aIsOnboarding && aIsIncomplete && otherIncompleteCourses.length === 0) return -1;
        if (bIsOnboarding && bIsIncomplete && otherIncompleteCourses.length === 0) return 1;
        
        // Otherwise sort by enrollment date (newest first)
        return new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime();
      });

      setEnrollments(sortedEnrollments);

      // Fetch certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user?.id);

      // Calculate total hours from all completions
      const totalMinutes = allCompletions?.reduce((sum, c) => sum + (c.time_spent_minutes || 0), 0) || 0;

      setStats({
        enrolledCourses: enrichedEnrollments.length,
        completedCourses: enrichedEnrollments.filter(e => e.status === 'completed').length,
        certificates: certificates?.length || 0,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching worker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (enrollment: CourseEnrollment) => {
    if (enrollment.total_modules === 0) return 0;
    return Math.round((enrollment.modules_completed / enrollment.total_modules) * 100);
  };

  const getValidUntilDate = (enrollment: CourseEnrollment) => {
    if (!enrollment.course.expiry_period_months) return null;
    const completionDate = enrollment.completions?.[0]?.completed_at;
    if (!completionDate) return null;
    return addMonths(new Date(completionDate), enrollment.course.expiry_period_months);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8 text-blue-600" />
            Worker Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Track your learning progress and complete your assigned courses.
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Worker Role
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.enrolledCourses}</div>
            <p className="text-xs text-muted-foreground">Active learning paths</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">Courses finished</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.certificates}</div>
            <p className="text-xs text-muted-foreground">Earned credentials</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
            <p className="text-xs text-muted-foreground">Time invested</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="certificates">My Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Active Courses Section */}
          <Card>
            <CardHeader>
              <CardTitle>My Learning</CardTitle>
              <CardDescription>Continue where you left off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No courses enrolled yet. Browse the course catalog to get started!
                </p>
              ) : (
                enrollments.map((enrollment) => {
                  const progress = getProgressPercentage(enrollment);
                  const validUntil = getValidUntilDate(enrollment);
                  const isCompleted = enrollment.status === 'completed';

                  return (
                    <Card key={enrollment.id} className="relative overflow-hidden">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-lg">{enrollment.course.title}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {enrollment.course.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {enrollment.course.difficulty}
                                  </Badge>
                                  {isCompleted && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {enrollment.modules_completed} of {enrollment.total_modules} modules
                                </span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            {validUntil && isCompleted && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Valid until: {format(validUntil, 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button asChild size="sm">
                              <Link to={`/courses/${enrollment.course_id}`}>
                                <PlayCircle className="h-4 w-4 mr-1" />
                                {isCompleted ? 'Review' : 'Continue'}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump into your learning journey</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild className="h-auto p-4 flex flex-col items-start gap-2 bg-blue-600 hover:bg-blue-700">
                <Link to="/courses">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Browse Courses</div>
                    <div className="text-xs opacity-90">Explore available training</div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <Link to="/catalog">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Course Catalog</div>
                    <div className="text-xs text-muted-foreground">Discover new courses</div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                <Link to="/profile">
                  <User className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Update Profile</div>
                    <div className="text-xs text-muted-foreground">Manage account</div>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-800">
                <TrendingUp className="h-5 w-5" />
                <p className="font-medium">Keep Learning!</p>
              </div>
              <p className="text-blue-700 mt-1">
                Complete your assigned courses to advance your skills and earn certificates. 
                Your progress is being tracked for compliance and professional development.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <MyCertificatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}