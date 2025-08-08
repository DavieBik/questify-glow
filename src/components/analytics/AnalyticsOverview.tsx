import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, BookOpen, Award, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DateRange } from "react-day-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface OverviewMetrics {
  totalLearners: number;
  activeLast7d: number;
  totalCourses: number;
  completions7d: number;
  completions30d: number;
  avgScore: number;
  avgTimePerCompletion: number;
}

export function AnalyticsOverview() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalLearners: 0,
    activeLast7d: 0,
    totalCourses: 0,
    completions7d: 0,
    completions30d: 0,
    avgScore: 0,
    avgTimePerCompletion: 0,
  });
  const [completionTrends, setCompletionTrends] = useState([]);
  const [coursePerformance, setCoursePerformance] = useState([]);
  const [learningPatterns, setLearningPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isManager } = useAuth();

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchOverviewData();
    }
  }, [dateRange]);

  const fetchOverviewData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      // Fetch KPI metrics
      const { data: progressData } = await supabase.rpc('rpc_admin_team_user_progress', {
        date_from: format(dateRange.from, 'yyyy-MM-dd'),
        date_to: format(dateRange.to, 'yyyy-MM-dd'),
        manager_scope: isManager && !isAdmin
      });

      const { data: courseData } = await supabase.rpc('rpc_course_metrics', {
        date_from: format(dateRange.from, 'yyyy-MM-dd'),
        date_to: format(dateRange.to, 'yyyy-MM-dd')
      });

      const { data: patternsData } = await supabase.rpc('rpc_learning_patterns', {
        date_from: format(dateRange.from, 'yyyy-MM-dd'),
        date_to: format(dateRange.to, 'yyyy-MM-dd')
      });

      // Calculate metrics
      const totalLearners = new Set(progressData?.map(p => p.user_id) || []).size;
      const activeLast7d = progressData?.filter(p => 
        new Date(p.last_activity_at) >= subDays(new Date(), 7)
      ).length || 0;
      
      const avgScore = progressData?.reduce((acc, p) => acc + (p.avg_score || 0), 0) / (progressData?.length || 1);
      const avgTime = progressData?.reduce((acc, p) => acc + (p.time_spent_minutes || 0), 0) / (progressData?.length || 1);

      setMetrics({
        totalLearners,
        activeLast7d,
        totalCourses: courseData?.length || 0,
        completions7d: progressData?.filter(p => 
          p.first_completed_at && new Date(p.first_completed_at) >= subDays(new Date(), 7)
        ).length || 0,
        completions30d: progressData?.filter(p => 
          p.first_completed_at && new Date(p.first_completed_at) >= subDays(new Date(), 30)
        ).length || 0,
        avgScore: Math.round(avgScore * 10) / 10,
        avgTimePerCompletion: Math.round(avgTime),
      });

      // Process chart data
      setCoursePerformance(courseData?.slice(0, 10).map(course => ({
        name: course.course_title || `Course ${course.course_id}`,
        avgTime: course.avg_time_minutes || 0,
        passRate: course.completion_rate || 0
      })) || []);

      setLearningPatterns(patternsData?.filter(p => p.bucket_type === 'hour').map(p => ({
        hour: `${p.bucket}:00`,
        completions: p.completions || 0
      })) || []);

    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Overview Dashboard</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLearners}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeLast7d} active in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              Available for learning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completions7d}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completions30d} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgScore}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgTimePerCompletion} min avg time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
            <CardDescription>Average completion time by course</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coursePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgTime" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Patterns</CardTitle>
            <CardDescription>Completions by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={learningPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completions" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}