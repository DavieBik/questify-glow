import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Award, Clock, TrendingUp, Bell, AlertTriangle, Calendar, CheckSquare, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnnouncementCard } from '@/components/app/AnnouncementCard';
import { DashboardStatsSkeleton } from '@/components/ui/loading-skeleton';
import { ManagerOrAdmin } from '@/components/auth/RoleGuard';
import { withErrorHandling } from '@/utils/error-handling';
import { useNotificationCount } from '@/hooks/useNotificationCount';

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalHours: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  expires_at?: string;
}


const Dashboard = () => {
  const { user, isManager, isAdmin } = useAuth();
  const { branding } = useBranding();
  const { unreadCount } = useNotificationCount();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalHours: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchAnnouncements();
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
    });
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    await withErrorHandling(async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .or('expires_at.is.null,expires_at.gt.now()')
        .eq('priority', 'high')
        .limit(3);
      
      if (error) throw error;
      setAnnouncements(data || []);
    });
  };


  const handleDismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncements(prev => [...prev, announcementId]);
  };

  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedAnnouncements.includes(announcement.id)
  );


  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your learning overview and critical updates
          </p>
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your learning overview and critical updates
        </p>
      </div>

      {/* Critical Announcements */}
      {visibleAnnouncements.map((announcement) => (
        <Alert key={announcement.id} className="border-l-4 border-l-destructive bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex items-start justify-between w-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">URGENT</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </span>
              </div>
              <AlertDescription className="font-medium">
                {announcement.title}
              </AlertDescription>
              {announcement.content && (
                <p className="text-sm text-muted-foreground mt-2">
                  {announcement.content}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground ml-4"
              onClick={() => handleDismissAnnouncement(announcement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}

      {/* Critical Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-1">
                {unreadCount}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {unreadCount > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/alerts">View All Notifications</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No new notifications</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/courses">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse All Courses
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/certificates">
                  <Award className="h-4 w-4 mr-2" />
                  My Certificates
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/messages">
                  <Bell className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enrolledCourses}</div>
            <p className="text-xs text-muted-foreground">courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificates}</div>
            <p className="text-xs text-muted-foreground">earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Access your most important learning tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/courses">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-sm">Browse Courses</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/alerts">
                <Bell className="h-6 w-6 text-destructive" />
                <span className="text-sm">Notifications</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
              <Link to="/certificates">
                <Award className="h-6 w-6 text-accent" />
                <span className="text-sm">Certificates</span>
              </Link>
            </Button>
            
            <ManagerOrAdmin>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
                <Link to="/admin/analytics">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                  <span className="text-sm">Analytics</span>
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