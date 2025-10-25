import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ModuleMetrics {
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
  attempts: number;
  avg_score: number;
  pass_rate: number;
  avg_time_minutes: number;
  dropoff_rate: number;
}

interface Course {
  id: string;
  title: string;
}

export function AnalyticsModules() {
  const [modules, setModules] = useState<ModuleMetrics[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState<any[]>([]);

  useEffect(() => {
    fetchCourses();
    fetchModuleMetrics();
  }, []);

  useEffect(() => {
    fetchModuleMetrics();
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_active', true);

      if (error) throw error;

      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchModuleMetrics = async () => {
    setLoading(true);
    try {
      const dateFrom = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const dateTo = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await (supabase as any).rpc('rpc_module_metrics', {
        course_id: selectedCourse === "all" ? null : selectedCourse,
        date_from: dateFrom,
        date_to: dateTo
      });

      if (error) throw error;

      setModules(data || []);
      
      // Generate trend data (mock data for demonstration)
      const trendData = (data || []).slice(0, 5).map((module: any, index: number) => {
        const weeks = [];
        for (let i = 7; i >= 0; i--) {
          weeks.push({
            week: format(subDays(new Date(), i * 7), 'MMM dd'),
            [module.module_title]: Math.floor(Math.random() * 100) + 50 + index * 10
          });
        }
        return weeks;
      }).flat() || [];

      setTrendsData(trendData);
    } catch (error) {
      console.error("Error fetching module metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return "text-primary";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getDropoffBadge = (rate: number) => {
    if (rate >= 30) return <Badge variant="destructive">High Risk</Badge>;
    if (rate >= 15) return <Badge variant="secondary">Moderate</Badge>;
    return <Badge>Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Module Analytics</h2>
        <div className="flex gap-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchModuleMetrics}>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Performance Trends Chart */}
      {trendsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Performance Trends (Last 8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                {modules.slice(0, 5).map((module, index) => (
                  <Line
                    key={module.module_id}
                    type="monotone"
                    dataKey={module.module_title}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Module Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Module Performance 
            {selectedCourse !== "all" && (
              <span className="text-base font-normal text-muted-foreground ml-2">
                - {courses.find(c => c.id === selectedCourse)?.title}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading module metrics...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Avg Time</TableHead>
                  <TableHead>Dropout Risk</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.module_id}>
                    <TableCell className="font-medium">
                      {module.module_title || `Module ${module.module_id.slice(-8)}`}
                    </TableCell>
                    <TableCell>
                      {module.course_title || 'Unknown Course'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        {module.attempts}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getPassRateColor(module.pass_rate)}>
                          {Math.round(module.pass_rate)}%
                        </span>
                        <Progress value={module.pass_rate} className="w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {Math.round(module.avg_score)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Math.round(module.avg_time_minutes)}m
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getDropoffBadge(module.dropoff_rate)}
                        <span className="text-xs text-muted-foreground">
                          {Math.round(module.dropoff_rate)}% dropout
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="text-sm font-medium">
                          {module.pass_rate >= 80 && module.dropoff_rate < 15 ? "Excellent" :
                           module.pass_rate >= 60 && module.dropoff_rate < 25 ? "Good" :
                           module.pass_rate >= 40 && module.dropoff_rate < 35 ? "Needs Work" : "Critical"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {module.pass_rate >= 80 && module.dropoff_rate < 15 ? "🟢" :
                           module.pass_rate >= 60 && module.dropoff_rate < 25 ? "🟡" :
                           module.pass_rate >= 40 && module.dropoff_rate < 35 ? "🟠" : "🔴"}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {modules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {selectedCourse === "all" ? 
                        "No module data available." : 
                        "No modules found for the selected course."
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {new Set(modules.map(m => m.course_id)).size} courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modules.length > 0 ? Math.round(modules.reduce((acc, m) => acc + m.pass_rate, 0) / modules.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modules.reduce((acc, m) => acc + m.attempts, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Learning attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {modules.filter(m => m.dropoff_rate >= 30).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}