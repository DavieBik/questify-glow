import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, BookOpen, Award, Clock, Download } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DateRange } from "react-day-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface OverviewMetrics {
  totalLearners: number;
  activeLast7d: number;
  totalCourses: number;
  completions7d: number;
  completions30d: number;
  avgScore: number;
  avgTimePerCompletion: number;
}

interface MonthlyData {
  month: string;
  completions: number;
  avgHours: number;
}

interface TopCourse {
  course_title: string;
  completions: number;
  avgScore: number;
}

export function AnalyticsOverview() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 180), // 6 months
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
  const [monthlyCompletions, setMonthlyCompletions] = useState<MonthlyData[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchOverviewData();
    }
  }, [dateRange]);

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, '_');
        return `"${row[key] || ''}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filename} has been downloaded`,
    });
  };

  const fetchOverviewData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      // Fetch all completions in date range
      const { data: completionsData, error: completionsError } = await supabase
        .from('completions')
        .select(`
          completed_at,
          time_spent_minutes,
          score_percentage,
          status,
          user_id,
          course_id,
          courses!inner(title)
        `)
        .eq('status', 'completed')
        .gte('completed_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('completed_at', format(dateRange.to, 'yyyy-MM-dd'))
        .not('completed_at', 'is', null);

      if (completionsError) throw completionsError;

      // Process monthly completions and engagement
      const monthsInRange = eachMonthOfInterval({
        start: dateRange.from,
        end: dateRange.to
      });

      const monthlyData: MonthlyData[] = monthsInRange.map(month => {
        const monthStr = format(month, 'yyyy-MM');
        const monthCompletions = (completionsData || []).filter(c => 
          c.completed_at && format(parseISO(c.completed_at), 'yyyy-MM') === monthStr
        );

        const totalMinutes = monthCompletions.reduce((sum, c) => sum + (c.time_spent_minutes || 0), 0);
        const avgHours = monthCompletions.length > 0 ? totalMinutes / 60 / monthCompletions.length : 0;

        return {
          month: format(month, 'MMM yyyy'),
          completions: monthCompletions.length,
          avgHours: Math.round(avgHours * 10) / 10
        };
      });

      setMonthlyCompletions(monthlyData);

      // Calculate top courses by completions
      const courseCounts = new Map<string, { count: number; scores: number[] }>();
      (completionsData || []).forEach(c => {
        const title = c.courses?.title || 'Unknown Course';
        const existing = courseCounts.get(title) || { count: 0, scores: [] };
        existing.count++;
        if (c.score_percentage) existing.scores.push(c.score_percentage);
        courseCounts.set(title, existing);
      });

      const topCoursesData: TopCourse[] = Array.from(courseCounts.entries())
        .map(([title, data]) => ({
          course_title: title,
          completions: data.count,
          avgScore: data.scores.length > 0 
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
            : 0
        }))
        .sort((a, b) => b.completions - a.completions)
        .slice(0, 10);

      setTopCourses(topCoursesData);

      // Calculate KPI metrics
      const uniqueLearners = new Set((completionsData || []).map(c => c.user_id)).size;
      const last7Days = subDays(new Date(), 7);
      const last30Days = subDays(new Date(), 30);
      
      const completions7d = (completionsData || []).filter(c => 
        c.completed_at && parseISO(c.completed_at) >= last7Days
      ).length;
      
      const completions30d = (completionsData || []).filter(c => 
        c.completed_at && parseISO(c.completed_at) >= last30Days
      ).length;

      const avgScore = completionsData && completionsData.length > 0
        ? completionsData.reduce((sum, c) => sum + (c.score_percentage || 0), 0) / completionsData.length
        : 0;

      const avgTime = completionsData && completionsData.length > 0
        ? completionsData.reduce((sum, c) => sum + (c.time_spent_minutes || 0), 0) / completionsData.length
        : 0;

      // Get total active courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('is_active', true);

      setMetrics({
        totalLearners: uniqueLearners,
        activeLast7d: new Set((completionsData || [])
          .filter(c => c.completed_at && parseISO(c.completed_at) >= last7Days)
          .map(c => c.user_id)
        ).size,
        totalCourses: coursesData?.length || 0,
        completions7d,
        completions30d,
        avgScore: Math.round(avgScore * 10) / 10,
        avgTimePerCompletion: Math.round(avgTime),
      });

    } catch (error) {
      console.error("Error fetching overview data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
        {/* Monthly Completions Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Monthly Completions</CardTitle>
                <CardDescription>Course completions by month</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  monthlyCompletions,
                  'monthly_completions',
                  ['Month', 'Completions']
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyCompletions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Completions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Engagement Trend (Average Hours)</CardTitle>
                <CardDescription>Average learning hours per completion by month</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  monthlyCompletions,
                  'engagement_trend',
                  ['Month', 'Avg Hours']
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyCompletions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgHours" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Avg Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Courses Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Courses by Completions</CardTitle>
                <CardDescription>Most completed courses in selected period</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  topCourses,
                  'top_courses',
                  ['Course Title', 'Completions', 'Avg Score']
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topCourses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="course_title" type="category" width={200} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completions" fill="hsl(var(--primary))" name="Completions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}