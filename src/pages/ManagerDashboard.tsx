import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDateRangePicker } from '@/components/ui/calendar-date-range-picker';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Users, 
  Download,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface DashboardMetrics {
  overdue_enrollments: number;
  due_soon_enrollments: number;
  completion_rate_30d: number;
  active_learners_7d: number;
}

interface TeamComplianceUser {
  user_id: string;
  user_name: string;
  email: string;
  department: string;
  role: string;
  required_courses: number;
  assigned_courses: number;
  completed_courses: number;
  overdue_courses: number;
  completion_percentage: number;
  last_activity: string;
}

interface ApprovalRequest {
  id: string;
  user_name: string;
  user_email: string;
  course_title: string;
  request_type: string;
  requested_at: string;
  status: string;
  reviewer_notes: string;
}

export default function ManagerDashboard() {
  const { isAdmin, isManager } = useAuth();
  
  // Check for role preview
  let hasManagerAccess = isAdmin || isManager;
  try {
    const { effectiveRole, isPreviewActive } = usePreviewRole();
    if (isPreviewActive && (effectiveRole === 'admin' || effectiveRole === 'manager')) {
      hasManagerAccess = true;
    }
  } catch (error) {
    // Preview context not available, use regular roles
  }
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [teamCompliance, setTeamCompliance] = useState<TeamComplianceUser[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  
  // Filters
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const handleDateRangeChange = (newDateRange: any) => {
    setDateRange({
      from: newDateRange?.from || subDays(new Date(), 30),
      to: newDateRange?.to || new Date()
    });
  };
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (hasManagerAccess) {
      fetchData();
      fetchDepartments();
    }
  }, [hasManagerAccess, dateRange, departmentFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Set role preview flag if preview is active
      if (hasManagerAccess && !isAdmin && !isManager) {
        // This means we have access through role preview
        try {
          await supabase.rpc('enable_role_preview');
        } catch (error) {
          console.warn('Could not set role preview flag:', error);
        }
      }

      await Promise.all([
        fetchMetrics(),
        fetchTeamCompliance(),
        fetchApprovals()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('rpc_manager_dashboard_metrics', {
      date_from: format(dateRange.from, 'yyyy-MM-dd'),
      date_to: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (error) throw error;
    setMetrics(data[0] || null);
  };

  const fetchTeamCompliance = async () => {
    const { data, error } = await supabase.rpc('rpc_team_compliance', {
      date_from: format(dateRange.from, 'yyyy-MM-dd'),
      date_to: format(dateRange.to, 'yyyy-MM-dd'),
      department_filter: departmentFilter || null
    });

    if (error) throw error;
    setTeamCompliance(data || []);
  };

  const fetchApprovals = async () => {
    const { data, error } = await supabase.rpc('rpc_approvals_queue');

    if (error) throw error;
    setApprovals(data || []);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('department')
      .not('department', 'is', null)
      .neq('department', '');

    if (error) {
      console.error('Error fetching departments:', error);
      return;
    }

    const uniqueDepts = [...new Set(data.map(u => u.department))].filter(Boolean);
    setDepartments(uniqueDepts);
  };

  const handleApproval = async (approvalId: string, status: 'approved' | 'denied') => {
    setProcessingApproval(approvalId);
    
    try {
      const { error } = await supabase.rpc('process_approval', {
        p_approval_id: approvalId,
        p_status: status,
        p_notes: reviewerNotes[approvalId] || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Request ${status} successfully`,
      });

      fetchApprovals(); // Refresh approvals list
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: `Failed to ${status} request`,
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  const exportCSV = async (exportType: 'team_compliance' | 'approvals_queue') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-csv', {
        body: {
          export_type: exportType,
          date_from: format(dateRange.from, 'yyyy-MM-dd'),
          date_to: format(dateRange.to, 'yyyy-MM-dd'),
          department_filter: departmentFilter || null
        }
      });

      if (error) throw error;

      // Create and download the CSV file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "CSV exported successfully",
      });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Manager or admin role required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor team compliance and manage approval requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <CalendarDateRangePicker
            date={dateRange}
            onDateChange={handleDateRangeChange}
          />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Enrollments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.overdue_enrollments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon (7 days)</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {metrics?.due_soon_enrollments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.completion_rate_30d || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Learners (7d)</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.active_learners_7d || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Compliance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Compliance</CardTitle>
              <CardDescription>
                Track required and assigned course completion by team members
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => exportCSV('team_compliance')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Completion %</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamCompliance.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.user_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.required_courses}</TableCell>
                  <TableCell>{user.assigned_courses}</TableCell>
                  <TableCell>{user.completed_courses}</TableCell>
                  <TableCell>
                    {user.overdue_courses > 0 ? (
                      <Badge variant="destructive">{user.overdue_courses}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.completion_percentage >= 80 ? "default" : "secondary"}
                    >
                      {user.completion_percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.last_activity ? format(new Date(user.last_activity), 'MMM dd, yyyy') : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approvals Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approvals Queue</CardTitle>
              <CardDescription>
                Review and process pending enrollment requests
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => exportCSV('approvals_queue')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvals.length > 0 ? (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{approval.user_name}</h3>
                      <p className="text-sm text-muted-foreground">{approval.user_email}</p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Course:</span> {approval.course_title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested {format(new Date(approval.requested_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline">{approval.request_type}</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add reviewer notes..."
                      value={reviewerNotes[approval.id] || ''}
                      onChange={(e) => setReviewerNotes(prev => ({
                        ...prev,
                        [approval.id]: e.target.value
                      }))}
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproval(approval.id, 'approved')}
                        disabled={processingApproval === approval.id}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {processingApproval === approval.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApproval(approval.id, 'denied')}
                        disabled={processingApproval === approval.id}
                        className="flex items-center gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        {processingApproval === approval.id ? 'Processing...' : 'Deny'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No pending approval requests</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}