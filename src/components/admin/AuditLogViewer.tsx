import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  User,
  Shield,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Users,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  created_at: string;
}

interface AuditLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogViewer({ open, onOpenChange }: AuditLogViewerProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  useEffect(() => {
    if (open) {
      fetchAuditLogs();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, searchTerm, actionFilter, resourceFilter]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      
      // Fetch audit logs with user information
      const { data, error } = await supabase
        .from('security_audit_log')
        .select(`
          *,
          users!left(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const transformedLogs: AuditLogEntry[] = (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        user_id: log.user_id,
        user_name: log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System',
        user_email: log.users?.email,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        details: log.details,
        created_at: log.created_at
      }));

      setAuditLogs(transformedLogs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Resource filter
    if (resourceFilter !== 'all') {
      filtered = filtered.filter(log => log.resource === resourceFilter);
    }

    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Timestamp', 'Action', 'Resource', 'User', 'Email', 'IP Address', 'Details'
      ];

      const csvData = filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action,
        log.resource || '',
        log.user_name || 'System',
        log.user_email || '',
        log.ip_address || '',
        log.details ? JSON.stringify(log.details) : ''
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Audit log exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export audit log');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return User;
      case 'USER_CREATED':
      case 'USER_INVITATION':
        return UserPlus;
      case 'BULK_ASSIGNMENT':
        return Users;
      case 'COURSE_CREATED':
      case 'COURSE_UPDATED':
        return BookOpen;
      case 'PERMISSIONS_CHANGED':
        return Shield;
      case 'DATA_EXPORT':
        return Download;
      case 'ANALYTICS_REFRESH':
        return RefreshCw;
      default:
        return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
        return 'bg-green-100 text-green-800';
      case 'USER_LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'USER_CREATED':
      case 'USER_INVITATION':
        return 'bg-blue-100 text-blue-800';
      case 'BULK_ASSIGNMENT':
        return 'bg-purple-100 text-purple-800';
      case 'PERMISSIONS_CHANGED':
        return 'bg-orange-100 text-orange-800';
      case 'DATA_EXPORT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
      case 'SECURITY_VIOLATION':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDetails = (details: any) => {
    if (!details) return 'No details';
    
    if (typeof details === 'string') return details;
    
    const formatted = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return formatted.length > 100 ? formatted.substring(0, 100) + '...' : formatted;
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueResources = [...new Set(auditLogs.map(log => log.resource).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Log
          </DialogTitle>
          <DialogDescription>
            Track system activities, user actions, and security events
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24h: {filteredLogs.filter(log => 
                    new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Actions</CardTitle>
                <User className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredLogs.filter(log => log.action.includes('USER')).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  User-related events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bulk Operations</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {filteredLogs.filter(log => log.action.includes('BULK')).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mass assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(log => 
                    log.action.includes('SECURITY') || log.action.includes('ERROR')
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Security-related events
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>System and user activity logs</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchAuditLogs} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={exportToCSV} disabled={filteredLogs.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by action, user, or resource..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {uniqueResources.map(resource => (
                      <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Log Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="animate-pulse">Loading audit logs...</div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit logs found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const ActionIcon = getActionIcon(log.action);
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ActionIcon className="h-4 w-4" />
                                <Badge className={getActionColor(log.action)}>
                                  {log.action}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">
                                  {log.user_name || 'System'}
                                </div>
                                {log.user_email && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.user_email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">
                                {log.resource || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {formatDetails(log.details)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-muted-foreground">
                                {log.ip_address || 'N/A'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}