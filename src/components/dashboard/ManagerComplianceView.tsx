import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, Download, TrendingUp } from 'lucide-react';
import { withErrorHandling } from '@/utils/error-handling';

interface TeamMetrics {
  totalStaff: number;
  averageCompletion: number;
  overdueCount: number;
  completionTrend: number;
}

export function ManagerComplianceView() {
  const { user, isManager, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<TeamMetrics>({
    totalStaff: 0,
    averageCompletion: 0,
    overdueCount: 0,
    completionTrend: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((isManager || isAdmin) && user) {
      fetchTeamMetrics();
    } else {
      setLoading(false);
    }
  }, [user, isManager, isAdmin]);

  const fetchTeamMetrics = async () => {
    await withErrorHandling(async () => {
      // Use the RPC function for team compliance metrics
      const { data, error } = await supabase.rpc('rpc_team_compliance', {
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const totalStaff = data.length;
        const averageCompletion = data.reduce((sum: number, user: any) => 
          sum + (user.completion_percentage || 0), 0) / totalStaff;
        const overdueCount = data.reduce((sum: number, user: any) => 
          sum + (user.overdue_courses || 0), 0);

        setMetrics({
          totalStaff,
          averageCompletion: Math.round(averageCompletion),
          overdueCount,
          completionTrend: 5, // This would be calculated from historical data
        });
      }
    });
    setLoading(false);
  };

  const handleExportReport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-csv', {
        body: { 
          report_type: 'team_compliance',
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          date_to: new Date().toISOString(),
        }
      });

      if (error) throw error;

      // Create download link
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = `team-compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Don't show this component if user is not a manager/admin
  if (!isManager && !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{metrics.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">Avg Completion</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{metrics.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Overdue Items</p>
          </div>
        </div>

        {/* Team Completion Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Team Completion Rate</span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+{metrics.completionTrend}%</span>
            </div>
          </div>
          <Progress value={metrics.averageCompletion} className="h-3" />
        </div>

        {/* Alert for Overdue */}
        {metrics.overdueCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              Action required: {metrics.overdueCount} overdue training items across your team
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button onClick={handleExportReport} size="sm" className="flex items-center gap-2">
            <Download className="h-3 w-3" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/analytics">View Detailed Analytics</a>
          </Button>
        </div>

        {/* Quick Summary */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Last 30 days performance summary</p>
          <p>• Includes all direct reports and their completion status</p>
          <p>• Export includes individual staff progress details</p>
        </div>
      </CardContent>
    </Card>
  );
}