import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  UserPlus,
  Calendar as CalendarIcon,
  CheckSquare,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { BulkAssignDialog } from '@/components/admin/BulkAssignDialog';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

interface UserEnrollment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  user_department: string;
  course_id: string;
  course_title: string;
  enrollment_status: string;
  due_at: string | null;
  enrollment_date: string;
  is_overdue: boolean;
  is_mandatory: boolean;
  completion_percentage: number;
}

interface AnalyticsTile {
  title: string;
  value: number;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
}

export default function AdminManagement() {
  const [enrollments, setEnrollments] = useState<UserEnrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<UserEnrollment[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsTile[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueFilter, setOverdueFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Dialog states
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [enrollments, searchTerm, teamFilter, roleFilter, statusFilter, overdueFilter, dateRange]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch enrollment data with user and course details
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          status,
          due_at,
          enrollment_date,
          users!user_course_enrollments_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            role,
            department
          ),
          courses!inner(
            id,
            title,
            is_mandatory
          )
        `)
        .order('enrollment_date', { ascending: false });

      if (enrollmentError) throw enrollmentError;

      // Transform data for display
      const transformedData: UserEnrollment[] = (enrollmentData || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        user_name: `${item.users.first_name} ${item.users.last_name}`,
        user_email: item.users.email,
        user_role: item.users.role,
        user_department: item.users.department || 'Unassigned',
        course_id: item.course_id,
        course_title: item.courses.title,
        enrollment_status: item.status,
        due_at: item.due_at,
        enrollment_date: item.enrollment_date,
        is_overdue: item.due_at ? new Date(item.due_at) < new Date() && item.status !== 'completed' : false,
        is_mandatory: item.courses.is_mandatory,
        completion_percentage: item.status === 'completed' ? 100 : 
                             item.status === 'in_progress' ? 50 : 0
      }));

      setEnrollments(transformedData);
      
      // Calculate analytics
      calculateAnalytics(transformedData);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load enrollment data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = (data: UserEnrollment[]) => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Active learners (users with activity in last 7 days)
    const activeUsers = new Set(
      data.filter(e => new Date(e.enrollment_date) > lastWeek).map(e => e.user_id)
    ).size;

    // Average completion time (mock calculation)
    const completedEnrollments = data.filter(e => e.enrollment_status === 'completed');
    const avgCompletionDays = completedEnrollments.length > 0 
      ? completedEnrollments.reduce((acc, e) => {
          const enrolled = new Date(e.enrollment_date);
          const completed = new Date(); // Would be completion_date if available
          return acc + Math.abs(completed.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedEnrollments.length
      : 0;

    // Overdue count
    const overdueCount = data.filter(e => e.is_overdue).length;

    // Total enrollments
    const totalEnrollments = data.length;

    const analyticsData: AnalyticsTile[] = [
      {
        title: 'Active Learners',
        value: activeUsers,
        change: 12, // Mock percentage change
        icon: Users,
        color: 'text-blue-600'
      },
      {
        title: 'Avg Completion Time',
        value: Math.round(avgCompletionDays),
        change: -8, // Mock percentage change
        icon: Clock,
        color: 'text-primary'
      },
      {
        title: 'Overdue Items',
        value: overdueCount,
        change: 5, // Mock percentage change
        icon: AlertTriangle,
        color: 'text-red-600'
      },
      {
        title: 'Total Enrollments',
        value: totalEnrollments,
        change: 15, // Mock percentage change
        icon: TrendingUp,
        color: 'text-purple-600'
      }
    ];

    setAnalytics(analyticsData);
  };

  const applyFilters = () => {
    let filtered = [...enrollments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.course_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Team/Department filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(e => e.user_department === teamFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(e => e.user_role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.enrollment_status === statusFilter);
    }

    // Overdue filter
    if (overdueFilter === 'overdue') {
      filtered = filtered.filter(e => e.is_overdue);
    } else if (overdueFilter === 'not_overdue') {
      filtered = filtered.filter(e => !e.is_overdue);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(e => new Date(e.enrollment_date) >= dateRange.from!);
    }
    if (dateRange.to) {
      filtered = filtered.filter(e => new Date(e.enrollment_date) <= dateRange.to!);
    }

    setFilteredEnrollments(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollments(filteredEnrollments.map(e => e.id));
    } else {
      setSelectedEnrollments([]);
    }
  };

  const handleSelectEnrollment = (enrollmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedEnrollments(prev => [...prev, enrollmentId]);
    } else {
      setSelectedEnrollments(prev => prev.filter(id => id !== enrollmentId));
    }
  };

  const exportToCSV = async () => {
    try {
      const headers = [
        'User Name', 'Email', 'Role', 'Department', 'Course', 
        'Status', 'Due Date', 'Enrollment Date', 'Mandatory', 'Progress %'
      ];

      const csvData = filteredEnrollments.map(e => [
        e.user_name,
        e.user_email,
        e.user_role,
        e.user_department,
        e.course_title,
        e.enrollment_status,
        e.due_at ? format(new Date(e.due_at), 'yyyy-MM-dd') : '',
        format(new Date(e.enrollment_date), 'yyyy-MM-dd'),
        e.is_mandatory ? 'Yes' : 'No',
        e.completion_percentage
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollment_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-primary/10 text-primary';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'enrolled': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const uniqueDepartments = [...new Set(enrollments.map(e => e.user_department))].filter(Boolean);
  const uniqueRoles = [...new Set(enrollments.map(e => e.user_role))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Learning Management</h1>
          <p className="text-muted-foreground">Manage enrollments, assignments, and track progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuditLog(true)}>
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </Button>
          <Button onClick={() => setShowBulkAssign(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
        </div>
      </div>

      {/* Analytics Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.title === 'Avg Completion Time' ? `${metric.value} days` : metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className={metric.change >= 0 ? 'text-primary' : 'text-red-600'}>
                  {metric.change >= 0 ? '+' : ''}{metric.change}%
                </span>
                {' '}from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Enrollment Management</CardTitle>
              <CardDescription>Filter and manage user course enrollments</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} disabled={filteredEnrollments.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV ({filteredEnrollments.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users or courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Team/Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Overdue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="not_overdue">Not Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Selection Actions */}
          {selectedEnrollments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedEnrollments.length} enrollment(s) selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Update Status</Button>
                  <Button size="sm" variant="outline">Set Due Date</Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedEnrollments([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enrollments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEnrollments.length === filteredEnrollments.length && filteredEnrollments.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-pulse">Loading enrollments...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No enrollments found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id} className={enrollment.is_overdue ? 'bg-red-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEnrollments.includes(enrollment.id)}
                          onCheckedChange={(checked) => handleSelectEnrollment(enrollment.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{enrollment.user_name}</div>
                          <div className="text-sm text-muted-foreground">{enrollment.user_email}</div>
                          <div className="text-xs text-muted-foreground">
                            {enrollment.user_role} • {enrollment.user_department}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{enrollment.course_title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(enrollment.enrollment_status)}>
                          {enrollment.enrollment_status}
                        </Badge>
                        {enrollment.is_overdue && (
                          <Badge className="ml-2 bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {enrollment.due_at ? (
                          <span className={enrollment.is_overdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(enrollment.due_at), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${enrollment.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {enrollment.completion_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {enrollment.is_mandatory && (
                          <Badge variant="outline" className="border-orange-200 text-orange-800">
                            Mandatory
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog 
        open={showBulkAssign} 
        onOpenChange={setShowBulkAssign}
        onSuccess={fetchData}
      />

      {/* Audit Log Dialog */}
      <AuditLogViewer 
        open={showAuditLog} 
        onOpenChange={setShowAuditLog}
      />
    </div>
  );
}