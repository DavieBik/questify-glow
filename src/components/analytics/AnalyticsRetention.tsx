import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subWeeks } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface RetentionMetrics {
  cohort_week: string;
  users_started: number;
  retained_30d: number;
  retained_60d: number;
  retained_90d: number;
  retention_30d_rate: number;
  retention_60d_rate: number;
  retention_90d_rate: number;
}

export function AnalyticsRetention() {
  const [retentionData, setRetentionData] = useState<RetentionMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    avgRetention30d: 0,
    avgRetention60d: 0,
    avgRetention90d: 0,
    totalCohorts: 0,
    totalUsers: 0,
    trend30d: 0,
    trend60d: 0,
    trend90d: 0
  });

  useEffect(() => {
    fetchRetentionMetrics();
  }, []);

  const fetchRetentionMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_retention_metrics');

      if (error) throw error;

      const processedData = data?.map((item: any) => ({
        cohort_week: format(new Date(item.cohort_week), 'MMM dd'),
        users_started: item.users_started || 0,
        retained_30d: item.retained_30d || 0,
        retained_60d: item.retained_60d || 0,
        retained_90d: item.retained_90d || 0,
        retention_30d_rate: item.users_started ? Math.round((item.retained_30d / item.users_started) * 100) : 0,
        retention_60d_rate: item.users_started ? Math.round((item.retained_60d / item.users_started) * 100) : 0,
        retention_90d_rate: item.users_started ? Math.round((item.retained_90d / item.users_started) * 100) : 0
      })) || [];

      setRetentionData(processedData);

      // Calculate summary statistics
      if (processedData.length > 0) {
        const totalUsers = processedData.reduce((sum, item) => sum + item.users_started, 0);
        const avgRetention30d = Math.round(processedData.reduce((sum, item) => sum + item.retention_30d_rate, 0) / processedData.length);
        const avgRetention60d = Math.round(processedData.reduce((sum, item) => sum + item.retention_60d_rate, 0) / processedData.length);
        const avgRetention90d = Math.round(processedData.reduce((sum, item) => sum + item.retention_90d_rate, 0) / processedData.length);

        // Calculate trends (compare last 4 weeks vs previous 4 weeks)
        const recent = processedData.slice(-4);
        const previous = processedData.slice(-8, -4);
        
        const recentAvg30d = recent.length > 0 ? recent.reduce((sum, item) => sum + item.retention_30d_rate, 0) / recent.length : 0;
        const previousAvg30d = previous.length > 0 ? previous.reduce((sum, item) => sum + item.retention_30d_rate, 0) / previous.length : 0;
        const trend30d = recentAvg30d - previousAvg30d;

        const recentAvg60d = recent.length > 0 ? recent.reduce((sum, item) => sum + item.retention_60d_rate, 0) / recent.length : 0;
        const previousAvg60d = previous.length > 0 ? previous.reduce((sum, item) => sum + item.retention_60d_rate, 0) / previous.length : 0;
        const trend60d = recentAvg60d - previousAvg60d;

        const recentAvg90d = recent.length > 0 ? recent.reduce((sum, item) => sum + item.retention_90d_rate, 0) / recent.length : 0;
        const previousAvg90d = previous.length > 0 ? previous.reduce((sum, item) => sum + item.retention_90d_rate, 0) / previous.length : 0;
        const trend90d = recentAvg90d - previousAvg90d;

        setSummaryStats({
          avgRetention30d,
          avgRetention60d,
          avgRetention90d,
          totalCohorts: processedData.length,
          totalUsers,
          trend30d: Math.round(trend30d * 10) / 10,
          trend60d: Math.round(trend60d * 10) / 10,
          trend90d: Math.round(trend90d * 10) / 10
        });
      }
    } catch (error) {
      console.error("Error fetching retention metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendText = (trend: number) => {
    if (Math.abs(trend) < 0.1) return "No change";
    return `${trend > 0 ? '+' : ''}${trend}% vs last period`;
  };

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Retention Analytics</h2>
          <p className="text-muted-foreground">
            Track learner engagement and retention over time
          </p>
        </div>
        <Button variant="outline" onClick={fetchRetentionMetrics}>
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">30-Day Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRetentionColor(summaryStats.avgRetention30d)}`}>
              {summaryStats.avgRetention30d}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(summaryStats.trend30d)}
              {getTrendText(summaryStats.trend30d)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">60-Day Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRetentionColor(summaryStats.avgRetention60d)}`}>
              {summaryStats.avgRetention60d}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(summaryStats.trend60d)}
              {getTrendText(summaryStats.trend60d)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">90-Day Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRetentionColor(summaryStats.avgRetention90d)}`}>
              {summaryStats.avgRetention90d}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(summaryStats.trend90d)}
              {getTrendText(summaryStats.trend90d)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalCohorts}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.totalUsers} total users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retention Cohort Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Cohort Retention</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading retention data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort_week" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name.includes('rate')) {
                      return [`${value}%`, name.replace('_rate', '').replace('retention_', '').toUpperCase()];
                    }
                    return [value, name.replace('_', ' ')];
                  }}
                />
                <Bar dataKey="retention_30d_rate" fill="hsl(var(--primary))" name="30d retention" />
                <Bar dataKey="retention_60d_rate" fill="hsl(var(--secondary))" name="60d retention" />
                <Bar dataKey="retention_90d_rate" fill="hsl(var(--accent))" name="90d retention" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Retention Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading trend data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort_week" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Retention Rate']} />
                <Line 
                  type="monotone" 
                  dataKey="retention_30d_rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="30-day"
                />
                <Line 
                  type="monotone" 
                  dataKey="retention_60d_rate" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="60-day"
                />
                <Line 
                  type="monotone" 
                  dataKey="retention_90d_rate" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="90-day"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Cohort Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading cohort details...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Cohort Week</th>
                    <th className="text-right p-2">Started</th>
                    <th className="text-right p-2">30d Retained</th>
                    <th className="text-right p-2">60d Retained</th>
                    <th className="text-right p-2">90d Retained</th>
                    <th className="text-center p-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionData.map((cohort, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cohort.cohort_week}</td>
                      <td className="p-2 text-right">{cohort.users_started}</td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span>{cohort.retained_30d}</span>
                          <Badge variant="outline" className="text-xs">
                            {cohort.retention_30d_rate}%
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span>{cohort.retained_60d}</span>
                          <Badge variant="outline" className="text-xs">
                            {cohort.retention_60d_rate}%
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span>{cohort.retained_90d}</span>
                          <Badge variant="outline" className="text-xs">
                            {cohort.retention_90d_rate}%
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <Badge 
                          variant={
                            cohort.retention_90d_rate >= 70 ? "default" :
                            cohort.retention_90d_rate >= 50 ? "secondary" : "destructive"
                          }
                        >
                          {cohort.retention_90d_rate >= 70 ? "Excellent" :
                           cohort.retention_90d_rate >= 50 ? "Good" : "Needs Work"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {retentionData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No retention data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}