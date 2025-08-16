import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Award, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LeaderboardCard } from '@/components/gamification/LeaderboardCard';
import { LearningStreakCard } from '@/components/gamification/LearningStreakCard';
import { PointsSystemCard } from '@/components/gamification/PointsSystemCard';
import { OrgSwitcher } from '@/components/demo/OrgSwitcher';
import { RequiredCoursesSection } from '@/components/dashboard/RequiredCoursesSection';
import { OptionalCoursesSection } from '@/components/dashboard/OptionalCoursesSection';
import { SelfAssignedSection } from '@/components/dashboard/SelfAssignedSection';
import { TeamViewWidget } from '@/components/dashboard/TeamViewWidget';

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalHours: number;
}

interface RecentCourse {
  id: string;
  title: string;
  difficulty: string;
  progress_percentage: number;
}

const Dashboard = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalHours: 0,
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrollment stats
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          progress_percentage,
          status,
          courses (
            id,
            title,
            difficulty,
            estimated_duration_minutes
          )
        `)
        .eq('user_id', user?.id);

      if (enrollmentError) throw enrollmentError;

      // Fetch certificates
      const { data: certificates, error: certError } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user?.id);

      if (certError) throw certError;

      // Calculate stats
      const enrolled = enrollments?.length || 0;
      const completed = enrollments?.filter(e => e.status === 'completed').length || 0;
      const totalMinutes = enrollments?.reduce((acc, e) => {
        return acc + (e.courses?.estimated_duration_minutes || 0);
      }, 0) || 0;

      setStats({
        enrolledCourses: enrolled,
        completedCourses: completed,
        certificates: certificates?.length || 0,
        totalHours: Math.round(totalMinutes / 60),
      });

      // Set recent courses (top 3 by progress)
      const recent = enrollments
        ?.filter(e => e.courses)
        .map(e => ({
          id: e.courses.id,
          title: e.courses.title,
          difficulty: e.courses.difficulty,
          progress_percentage: e.progress_percentage,
        }))
        .sort((a, b) => b.progress_percentage - a.progress_percentage)
        .slice(0, 3) || [];

      setRecentCourses(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Learning Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress and continue your learning journey
        </p>
      </div>

      {/* Demo Organization Switcher */}
      <OrgSwitcher />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enrolledCourses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCourses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
          </CardContent>
        </Card>
      </div>

      {/* Course Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RequiredCoursesSection />
        <OptionalCoursesSection />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SelfAssignedSection />
        {(isManager || isAdmin) && <TeamViewWidget />}
      </div>

      {/* Gamification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LeaderboardCard />
        <LearningStreakCard />
        <PointsSystemCard />
      </div>

      {/* Continue Learning - Recent Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Continue Learning</CardTitle>
          <CardDescription>
            Pick up where you left off with your recent courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCourses.length > 0 ? (
            <div className="space-y-4">
              {recentCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h3 className="font-medium">{course.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {course.progress_percentage}% complete
                      </span>
                    </div>
                  </div>
                  <Button asChild>
                    <Link to={`/courses/${course.id}`}>
                      Continue
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No courses enrolled yet</p>
              <Button asChild>
                <Link to="/courses">Browse Courses</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;