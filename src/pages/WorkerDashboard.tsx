import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Award, Clock, TrendingUp, User, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MyCertificatesTab } from '@/components/certificates/MyCertificatesTab';

interface WorkerStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalHours: number;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkerStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWorkerStats();
    }
  }, [user]);

  const fetchWorkerStats = async () => {
    setLoading(true);
    try {
      const [enrollmentsResult, certificatesResult] = await Promise.all([
        supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user?.id)
      ]);

      const enrollments = enrollmentsResult.data || [];
      const certificates = certificatesResult.data || [];
      
      setStats({
        enrolledCourses: enrollments.length,
        completedCourses: enrollments.filter(e => e.status === 'completed').length,
        certificates: certificates.length,
        totalHours: 0
      });
    } catch (error) {
      console.error('Error fetching worker stats:', error);
    } finally {
      setLoading(false);
    }
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