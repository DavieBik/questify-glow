import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Award, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { MyAssignedCourses } from '@/components/dashboard/MyAssignedCourses';
import { CertificatesSection } from '@/components/dashboard/CertificatesSection';
import { ManagerComplianceView } from '@/components/dashboard/ManagerComplianceView';
import { OrgSwitcher } from '@/components/demo/OrgSwitcher';
import { RequiredCoursesSection } from '@/components/dashboard/RequiredCoursesSection';
import { OptionalCoursesSection } from '@/components/dashboard/OptionalCoursesSection';
import { SelfAssignedSection } from '@/components/dashboard/SelfAssignedSection';
import { TeamViewWidget } from '@/components/dashboard/TeamViewWidget';
import { DashboardStatsSkeleton } from '@/components/ui/loading-skeleton';
import { ManagerOrAdmin } from '@/components/auth/RoleGuard';
import { withErrorHandling } from '@/utils/error-handling';

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
  const { branding } = useBranding();
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
    await withErrorHandling(async () => {
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
    });
    setLoading(false);
  };

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
        <div>
          <h1 className="text-3xl font-bold">Learning Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and continue your learning journey
          </p>
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optional Banner */}
      {branding?.banner_image_url && (
        <div className="relative rounded-lg overflow-hidden h-48 bg-gradient-to-r from-primary/20 to-primary/5">
          <img 
            src={branding.banner_image_url} 
            alt="Organization Banner" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome to Learning</h2>
              <p className="text-white/90">Continue your learning journey</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Track your training compliance and required certifications
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

      {/* Compliance Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplianceOverview />
        <MyAssignedCourses />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CertificatesSection />
        <ManagerOrAdmin>
          <ManagerComplianceView />
        </ManagerOrAdmin>
      </div>

      {/* Continue Learning - Recent Courses */}
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and navigation shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 border-primary/20 hover:bg-primary/10">
              <Link to="/courses" className="flex flex-col items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <span>Browse Courses</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 border-accent/20 hover:bg-accent/10">
              <Link to="/certificates" className="flex flex-col items-center gap-2">
                <Award className="h-6 w-6 text-accent" />
                <span>View Certificates</span>
              </Link>
            </Button>
            
            <ManagerOrAdmin>
              <Button asChild variant="outline" className="h-auto p-4 border-secondary/20 hover:bg-secondary/10">
                <Link to="/admin/analytics" className="flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                  <span>Team Reports</span>
                </Link>
              </Button>
            </ManagerOrAdmin>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;