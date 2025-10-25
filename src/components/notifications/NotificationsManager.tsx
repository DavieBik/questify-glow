import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Play, Settings, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface NotificationLog {
  id: string;
  user_email: string;
  notification_type: string;
  status: string;
  sent_at: string;
  error_message?: string;
  template_used: string;
}

export const NotificationsManager = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [daysAhead, setDaysAhead] = useState(3);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    if (user && (isAdmin || isManager)) {
      fetchNotificationLogs();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin, isManager, filterType, filterStatus]);

  const fetchNotificationLogs = async () => {
    console.debug('[NotificationsManager] fetching notification logs...');

    try {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (filterType !== 'all') {
        query = query.eq('notification_type', filterType);
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: notificationLogs, error } = await query;

      if (error) throw error;

      // Get user emails for the logs
      const userIds = [...new Set(notificationLogs?.map(log => log.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

        const processedLogs = notificationLogs?.map(log => ({
          id: log.id,
          user_email: userMap.get(log.user_id) || 'Unknown',
          notification_type: log.notification_type,
          status: log.status,
          sent_at: log.sent_at,
          error_message: log.error_message,
          template_used: log.template_used,
        })) || [];

        setLogs(processedLogs);
      } else {
        setLogs([]);
      }

    } catch (error: any) {
      console.error('[NotificationsManager] Error fetching logs:', error);
      toast.error('Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  };

  const runNotifications = async () => {
    setRunning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('notifications-service', {
        body: {
          type: filterType === 'all' ? 'all' : filterType,
          days_ahead: daysAhead,
          dry_run: dryRun
        }
      });

      if (error) throw error;

      toast.success(
        dryRun 
          ? `Dry run completed: ${data.result?.length || 0} notifications would be sent`
          : `Notifications sent: ${data.sent || 0} successful, ${data.errors || 0} errors`
      );

      // Refresh logs
      fetchNotificationLogs();
      
    } catch (error: any) {
      console.error('[NotificationsManager] Error running notifications:', error);
      toast.error('Failed to run notifications service');
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'due_soon': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'enrollment_reminder': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Access denied. Admin or manager role required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notifications Control Panel
          </CardTitle>
          <CardDescription>
            Manage and monitor course reminder notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="notification-type">Notification Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="days-ahead">Days Ahead</Label>
              <Input
                id="days-ahead"
                type="number"
                min="1"
                max="14"
                value={daysAhead}
                onChange={(e) => setDaysAhead(parseInt(e.target.value) || 3)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dry-run">Dry Run Mode</Label>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={runNotifications} 
                disabled={running}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {running ? 'Running...' : 'Run Notifications'}
              </Button>
            </div>
          </div>

          {dryRun && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Dry Run Mode:</strong> Notifications will be processed but not actually sent. 
                Turn off dry run mode to send real notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Logs
          </CardTitle>
          <CardDescription>
            Recent notification activity ({logs.length} records)
          </CardDescription>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchNotificationLogs}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.user_email}</span>
                        <Badge className={getTypeColor(log.notification_type)}>
                          {log.notification_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                        {log.error_message && (
                          <span className="text-red-600 ml-2">• {log.error_message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No notification logs found</p>
              <p className="text-muted-foreground">Run the notifications service to see logs here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};