import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { DeploymentHealthCard } from './DeploymentHealthCard';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  completedCourses: number;
  certificates: number;
  pendingInvitations: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'completion' | 'certificate';
  user_name: string;
  course_title?: string;
  created_at: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    completedCourses: 0,
    certificates: 0,
    pendingInvitations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch users stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, is_active');
      
      if (usersError) throw usersError;

      // Fetch courses stats
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, is_active');
      
      if (coursesError) throw coursesError;

      // Fetch enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('user_course_enrollments')
        .select('id, status');
      
      if (enrollmentsError) throw enrollmentsError;

      // Fetch certificates
      const { data: certificates, error: certError } = await supabase
        .from('certificates')
        .select('id');
      
      if (certError) throw certError;

      // Fetch recent enrollments for activity
      const { data: recentEnrollments, error: recentError } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          enrollment_date,
          status,
          users!user_course_enrollments_user_id_fkey(first_name, last_name),
          courses!user_course_enrollments_course_id_fkey(title)
        `)
        .order('enrollment_date', { ascending: false })
        .limit(10);
      
      if (recentError) throw recentError;

      setStats({
        totalUsers: users?.length || 0,
        activeUsers: users?.filter(u => u.is_active).length || 0,
        totalCourses: courses?.length || 0,
        activeCourses: courses?.filter(c => c.is_active).length || 0,
        totalEnrollments: enrollments?.length || 0,
        completedCourses: enrollments?.filter(e => e.status === 'completed').length || 0,
        certificates: certificates?.length || 0,
        pendingInvitations: 0, // This would need a separate invitations table
      });

      // Transform recent activity
      const activity: RecentActivity[] = recentEnrollments?.map(enrollment => ({
        id: enrollment.id,
        type: enrollment.status === 'completed' ? 'completion' : 'enrollment',
        user_name: `${enrollment.users.first_name} ${enrollment.users.last_name}`,
        course_title: enrollment.courses.title,
        created_at: enrollment.enrollment_date,
      })) || [];

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'certificate':
        return <Award className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completionRate = stats.totalEnrollments > 0 
    ? Math.round((stats.completedCourses / stats.totalEnrollments) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor system performance and user activity
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3 text-primary" />
              {stats.activeUsers} active
              <UserX className="h-3 w-3 text-red-600 ml-2" />
              {stats.totalUsers - stats.activeUsers} inactive
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCourses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCourses} total courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="flex-1" />
              <span className="text-xs text-muted-foreground">{completionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedCourses} completions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Health */}
      <DeploymentHealthCard />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link to="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user enrollments and completions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.user_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.type === 'enrollment' ? 'Enrolled in' : 'Completed'} {activity.course_title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Key metrics and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">User Engagement</span>
                    <Badge variant="outline" className="text-primary">
                      Good
                    </Badge>
                  </div>
                  <Progress value={75} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Course Completion</span>
                    <Badge variant="outline" className="text-yellow-600">
                      Average
                    </Badge>
                  </div>
                  <Progress value={completionRate} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Load</span>
                    <Badge variant="outline" className="text-primary">
                      Low
                    </Badge>
                  </div>
                  <Progress value={25} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="performance" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Performance metrics coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}