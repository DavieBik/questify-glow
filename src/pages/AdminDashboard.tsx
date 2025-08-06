import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Trophy, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalCompletions: number;
}

interface WeeklyData {
  week: string;
  signups: number;
  completions: number;
}

const chartConfig = {
  signups: {
    label: "New Sign-ups",
    color: "hsl(var(--primary))",
  },
  completions: {
    label: "Completions",
    color: "hsl(var(--secondary))",
  },
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalCompletions: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total counts
      const [usersResponse, coursesResponse, completionsResponse] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('completions').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersResponse.count || 0,
        totalCourses: coursesResponse.count || 0,
        totalCompletions: completionsResponse.count || 0,
      });

      // Fetch weekly data for the last 8 weeks
      const weeklySignups = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString());

      const weeklyCompletions = await supabase
        .from('completions')
        .select('completed_at')
        .not('completed_at', 'is', null)
        .gte('completed_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString());

      // Process weekly data
      const weeklyStats: { [key: string]: { signups: number; completions: number } } = {};
      
      // Get last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const weekKey = `Week ${8 - i}`;
        weeklyStats[weekKey] = { signups: 0, completions: 0 };
      }

      // Count signups by week
      weeklySignups.data?.forEach(user => {
        const userDate = new Date(user.created_at);
        const weeksAgo = Math.floor((Date.now() - userDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo >= 0 && weeksAgo < 8) {
          const weekKey = `Week ${8 - weeksAgo}`;
          if (weeklyStats[weekKey]) {
            weeklyStats[weekKey].signups++;
          }
        }
      });

      // Count completions by week
      weeklyCompletions.data?.forEach(completion => {
        const completionDate = new Date(completion.completed_at);
        const weeksAgo = Math.floor((Date.now() - completionDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo >= 0 && weeksAgo < 8) {
          const weekKey = `Week ${8 - weeksAgo}`;
          if (weeklyStats[weekKey]) {
            weeklyStats[weekKey].completions++;
          }
        }
      });

      const chartData = Object.entries(weeklyStats).map(([week, data]) => ({
        week,
        signups: data.signups,
        completions: data.completions,
      }));

      setWeeklyData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of platform activity and key metrics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              Available learning courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompletions}</div>
            <p className="text-xs text-muted-foreground">
              Course completions achieved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>
            New sign-ups vs. course completions over the last 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="signups" 
                  fill="var(--color-signups)" 
                  radius={[4, 4, 0, 0]}
                  name="New Sign-ups"
                />
                <Bar 
                  dataKey="completions" 
                  fill="var(--color-completions)" 
                  radius={[4, 4, 0, 0]}
                  name="Completions"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;