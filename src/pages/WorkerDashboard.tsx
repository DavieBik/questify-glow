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
import { cn } from '@/lib/utils';

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

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Learner';

  const statHighlights = [
    {
      id: 'enrolled',
      label: 'Enrolled Courses',
      description: 'Active learning paths',
      value: stats.enrolledCourses,
      icon: BookOpen,
      cardClass: 'from-blue-50 via-white to-sky-50 border-blue-100 text-brand-navy',
      iconClass: 'bg-blue-100 text-blue-600',
      valueClass: 'text-blue-700',
      accentClass: 'bg-blue-400/60',
    },
    {
      id: 'completed',
      label: 'Completed',
      description: 'Courses finished',
      value: stats.completedCourses,
      icon: Target,
      cardClass: 'from-primary/5 via-white to-primary/10 border-primary/10 text-brand-navy',
      iconClass: 'bg-primary/10 text-primary',
      valueClass: 'text-primary',
      accentClass: 'bg-primary/60',
    },
    {
      id: 'certificates',
      label: 'Certificates',
      description: 'Earned credentials',
      value: stats.certificates,
      icon: Award,
      cardClass: 'from-amber-50 via-white to-yellow-100 border-amber-100 text-brand-navy',
      iconClass: 'bg-amber-100 text-amber-600',
      valueClass: 'text-amber-600',
      accentClass: 'bg-amber-400/70',
    },
    {
      id: 'hours',
      label: 'Learning Hours',
      description: 'Time invested',
      value: stats.totalHours,
      icon: Clock,
      cardClass: 'from-violet-50 via-white to-purple-100 border-purple-100 text-brand-navy',
      iconClass: 'bg-purple-100 text-purple-600',
      valueClass: 'text-purple-600',
      accentClass: 'bg-purple-400/70',
    },
  ];

  useEffect(() => {
    if (user) {
      fetchWorkerData();
    }
  }, [user]);

  const fetchWorkerData = async () => {
    setLoading(true);
    try {
      // PHASE 1 FIX: Optimized query - fetch all data in batches to avoid N+1
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

      if (!enrollmentsData || enrollmentsData.length === 0) {
        setEnrollments([]);
        setStats({
          enrolledCourses: 0,
          completedCourses: 0,
          certificates: 0,
          totalHours: 0,
        });
        setLoading(false);
        return;
      }

      const courseIds = enrollmentsData.map(e => e.course_id);

      // Fetch ALL modules for ALL courses in ONE query
      const { data: allModules } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('course_id', courseIds);

      // Fetch ALL completions for this user across ALL courses in ONE query
      const { data: allCompletions } = await supabase
        .from('completions')
        .select('course_id, module_id, completed_at, time_spent_minutes, status')
        .eq('user_id', user?.id)
        .in('course_id', courseIds);

      // Build lookup maps for O(1) access
      const moduleCountByCourse = new Map<string, number>();
      const completionsByCourse = new Map<string, Array<{ completed_at: string | null, time_spent_minutes: number | null }>>();

      // Group modules by course
      allModules?.forEach(m => {
        moduleCountByCourse.set(m.course_id, (moduleCountByCourse.get(m.course_id) || 0) + 1);
      });

      // Group completions by course
      allCompletions?.forEach(c => {
        if (c.status === 'completed') {
          if (!completionsByCourse.has(c.course_id)) {
            completionsByCourse.set(c.course_id, []);
          }
          completionsByCourse.get(c.course_id)?.push({
            completed_at: c.completed_at,
            time_spent_minutes: c.time_spent_minutes,
          });
        }
      });

      // Enrich enrollments with progress data (no more queries!)
      const enrichedEnrollments = enrollmentsData.map(enrollment => {
        const totalModules = moduleCountByCourse.get(enrollment.course_id) || 0;
        const courseCompletions = completionsByCourse.get(enrollment.course_id) || [];

        return {
          ...enrollment,
          total_modules: totalModules,
          modules_completed: courseCompletions.length,
          completions: courseCompletions,
        };
      });

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
      <div className="overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-card md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <User className="h-4 w-4" />
              Worker Dashboard
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold md:text-4xl">Welcome back, {displayName}!</h1>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                Track your learning progress and complete your assigned courses.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-4 text-sm text-white/80 backdrop-blur-sm md:text-base">
            <Badge variant="outline" className="w-fit border-white/50 bg-white/20 px-3 py-1 text-white">
              Worker Role
            </Badge>
            <div className="grid gap-1 text-white/80">
              <span>
                <span className="font-semibold text-white">{stats.enrolledCourses}</span> enrolled
              </span>
              <span>
                <span className="font-semibold text-white">{stats.completedCourses}</span> completed
              </span>
              <span>
                <span className="font-semibold text-white">{stats.totalHours}</span> hours logged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statHighlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <Card
              key={highlight.id}
              className={cn(
                "relative overflow-hidden bg-gradient-to-br shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                "border border-transparent",
                highlight.cardClass
              )}
            >
              <span
                aria-hidden="true"
                className={cn("absolute inset-x-0 top-0 h-1", highlight.accentClass)}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold tracking-tight text-brand-navy/80">
                    {highlight.label}
                  </CardTitle>
                  <p className="text-xs text-brand-navy/60">{highlight.description}</p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full bg-white/70",
                    highlight.iconClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={cn("text-3xl font-bold", highlight.valueClass)}>{highlight.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-2 flex-wrap gap-2 rounded-full border border-muted/60 bg-white/80 p-1 text-sm shadow-inner backdrop-blur">
          <TabsTrigger
            value="overview"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="certificates"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card"
          >
            My Certificates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Active Courses Section */}
          <Card className="border border-muted/60 bg-white shadow-card">
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
                    <Card
                      key={enrollment.id}
                      className={cn(
                        'relative overflow-hidden border border-muted/60 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
                        isCompleted
                          ? 'bg-gradient-to-br from-primary/5 via-white to-primary/10 border-primary/10'
                          : 'bg-gradient-to-br from-white via-white to-sky-100 border-blue-100'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-x-0 top-0 h-1',
                          isCompleted ? 'bg-primary/70' : 'bg-blue-400/70'
                        )}
                      />
                      <CardContent className="space-y-4 pt-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <h3 className="text-lg font-semibold text-brand-navy">{enrollment.course.title}</h3>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="bg-white/80 text-xs text-brand-navy">
                                      {enrollment.course.category}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white/80 text-xs capitalize text-brand-navy">
                                      {enrollment.course.difficulty}
                                    </Badge>
                                    {isCompleted && (
                                      <Badge className="border-primary/20 bg-primary/10 text-primary">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Completed
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-brand-navy/70">
                                  <span>
                                    {enrollment.modules_completed} of {enrollment.total_modules} modules
                                  </span>
                                  <span className="font-semibold text-brand-navy">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-3 bg-white/60" />
                              </div>
                            </div>

                            {validUntil && isCompleted && (
                              <div className="flex items-center gap-1 text-xs text-brand-navy/70">
                                <Calendar className="h-3 w-3" />
                                <span>Valid until: {format(validUntil, 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-stretch gap-2">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-full bg-primary text-primary-foreground shadow-card hover:bg-primary/90"
                            >
                              <Link to={`/courses/${enrollment.course_id}`}>
                                <PlayCircle className="mr-1 h-4 w-4" />
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

          <Card className="border border-muted/60 bg-white shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump into your learning journey</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                asChild
                className="flex h-auto flex-col items-start gap-2 rounded-2xl bg-primary p-4 text-left text-primary-foreground shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                <Link to="/courses">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Browse Courses</div>
                    <div className="text-xs opacity-90">Explore available training</div>
                  </div>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="flex h-auto flex-col items-start gap-2 rounded-2xl border border-muted/70 bg-white p-4 text-left text-brand-navy shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              >
                <Link to="/catalog">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Course Catalog</div>
                    <div className="text-xs text-muted-foreground">Discover new courses</div>
                  </div>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="flex h-auto flex-col items-start gap-2 rounded-2xl border border-muted/70 bg-white p-4 text-left text-brand-navy shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              >
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

          <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-100 shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-900">
                <TrendingUp className="h-5 w-5" />
                <p className="font-medium">Keep Learning!</p>
              </div>
              <p className="mt-1 text-sm text-blue-800">
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
