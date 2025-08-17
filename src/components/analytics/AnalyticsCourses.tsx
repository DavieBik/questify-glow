import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface CourseMetrics {
  course_id: string;
  course_title: string;
  learners: number;
  in_progress: number;
  completed: number;
  completion_rate: number;
  avg_score: number;
  median_score: number;
  avg_time_minutes: number;
  completed_last_30d: number;
  started_last_30d: number;
}

interface CourseDetail {
  course: CourseMetrics;
  trends: any[];
  modules: any[];
  strugglingLearners: any[];
}

export function AnalyticsCourses() {
  const [courses, setCourses] = useState<CourseMetrics[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchCourseMetrics();
  }, []);

  const fetchCourseMetrics = async () => {
    setLoading(true);
    try {
      const dateFrom = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const dateTo = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await (supabase as any).rpc('rpc_course_metrics', {
        date_from: dateFrom,
        date_to: dateTo
      });

      if (error) throw error;

      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching course metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetail = async (course: CourseMetrics) => {
    try {
      // Fetch module metrics for this course
      const { data: moduleData } = await (supabase as any).rpc('rpc_module_metrics', {
        course_id: course.course_id,
        date_from: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
        date_to: format(new Date(), 'yyyy-MM-dd')
      });

      // Fetch struggling learners (users with low scores or high time)
      const { data: progressData } = await (supabase as any).rpc('rpc_admin_team_user_progress', {
        date_from: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
        date_to: format(new Date(), 'yyyy-MM-dd'),
        manager_scope: false
      });

      const strugglingLearners = (progressData || []).filter((p: any) => 
        p.course_id === course.course_id && 
        (p.avg_score < 70 || p.time_spent_minutes > course.avg_time_minutes * 2)
      ).slice(0, 10);

      setSelectedCourse({
        course,
        trends: [], // Would implement with historical data
        modules: moduleData || [],
        strugglingLearners
      });
      setShowDetail(true);
    } catch (error) {
      console.error("Error fetching course detail:", error);
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-primary";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-primary" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <BarChart3 className="h-4 w-4 text-gray-500" />;
  };

  if (showDetail && selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">{selectedCourse.course.course_title}</h2>
            <p className="text-muted-foreground">Detailed course analytics</p>
          </div>
          <Button variant="outline" onClick={() => setShowDetail(false)}>
            Back to Courses
          </Button>
        </div>

        {/* Course Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCourse.course.learners}</div>
              <p className="text-xs text-muted-foreground">
                {selectedCourse.course.started_last_30d} started last 30d
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCompletionRateColor(selectedCourse.course.completion_rate)}`}>
                {Math.round(selectedCourse.course.completion_rate)}%
              </div>
              <Progress value={selectedCourse.course.completion_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(selectedCourse.course.avg_score)}%</div>
              <p className="text-xs text-muted-foreground">
                Median: {Math.round(selectedCourse.course.median_score)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(selectedCourse.course.avg_time_minutes)}m</div>
              <p className="text-xs text-muted-foreground">
                Per completion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Module Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Module Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedCourse.modules.map((module: any, index: number) => (
                <div key={module.module_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Module {index + 1}</h4>
                    <p className="text-sm text-muted-foreground">
                      {module.attempts} attempts • {Math.round(module.avg_score)}% avg score
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={module.pass_rate >= 80 ? "default" : "secondary"}>
                      {Math.round(module.pass_rate)}% pass rate
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(module.dropoff_rate)}% dropout
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Struggling Learners */}
        {selectedCourse.strugglingLearners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Learners Needing Support</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCourse.strugglingLearners.map((learner: any) => (
                    <TableRow key={learner.user_id}>
                      <TableCell>{learner.user_name}</TableCell>
                      <TableCell>{Math.round(learner.avg_score)}%</TableCell>
                      <TableCell>{Math.round(learner.time_spent_minutes)}m</TableCell>
                      <TableCell>{learner.attempts}</TableCell>
                      <TableCell>
                        {format(new Date(learner.last_activity_at), 'MMM dd')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Course Analytics</h2>
        <Button variant="outline" onClick={fetchCourseMetrics}>
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading course metrics...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Learners</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Avg Time</TableHead>
                  <TableHead>Recent Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell className="font-medium">{course.course_title}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{course.learners}</div>
                        <div className="text-sm text-muted-foreground">
                          {course.in_progress} in progress, {course.completed} completed
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getCompletionRateColor(course.completion_rate)}>
                          {Math.round(course.completion_rate)}%
                        </span>
                        <Progress value={course.completion_rate} className="w-16" />
                      </div>
                    </TableCell>
                    <TableCell>{Math.round(course.avg_score)}%</TableCell>
                    <TableCell>{Math.round(course.avg_time_minutes)}m</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(course.completed_last_30d, course.started_last_30d)}
                        <span className="text-sm">
                          {course.completed_last_30d} completed
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCourseDetail(course)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No course data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}