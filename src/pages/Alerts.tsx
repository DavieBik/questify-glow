import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check, Clock, AlertCircle, BookOpen, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: any;
  read_at: string | null;
  created_at: string;
}

const Alerts: React.FC = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      ));

      toast({
        title: 'Marked as read',
        description: 'Notification has been marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(notification => 
        unreadIds.includes(notification.id)
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      ));

      toast({
        title: 'All notifications marked as read',
        description: `${unreadIds.length} notifications marked as read`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue_enrollment':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'course_assignment':
        return <BookOpen className="h-4 w-4 text-primary" />;
      case 'deadline_reminder':
        return <Calendar className="h-4 w-4 text-warning" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'overdue_enrollment':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'course_assignment':
        return <Badge variant="default">Assignment</Badge>;
      case 'deadline_reminder':
        return <Badge variant="secondary">Reminder</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read_at);
  const readNotifications = notifications.filter(n => n.read_at);

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = ({ isUnread }: { isUnread: boolean }) => (
    <div className="text-center py-12">
      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {isUnread ? "You're all caught up!" : "No notifications"}
      </h3>
      <p className="text-muted-foreground">
        {isUnread 
          ? "All your notifications have been read. New alerts will appear here."
          : "You don't have any read notifications yet."
        }
      </p>
    </div>
  );

  const NotificationList = ({ items, showActions = true }: { items: Notification[], showActions?: boolean }) => (
    <div className="space-y-4">
      {items.map((notification) => (
        <Card key={notification.id} className={`transition-colors ${!notification.read_at ? 'border-primary bg-primary/5' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {getNotificationBadge(notification.type)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(notification.created_at)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{notification.body}</p>
                
                {notification.metadata && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {notification.metadata.days_overdue && (
                      <div>Days overdue: {notification.metadata.days_overdue}</div>
                    )}
                    {notification.metadata.due_at && (
                      <div>Due date: {new Date(notification.metadata.due_at).toLocaleDateString()}</div>
                    )}
                    {notification.metadata.email_sent === false && (
                      <div className="text-amber-600">Email delivery failed</div>
                    )}
                  </div>
                )}

                {showActions && !notification.read_at && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(notification.id)}
                      disabled={markingAsRead === notification.id}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {markingAsRead === notification.id ? 'Marking...' : 'Mark as read'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">Stay updated with your notifications</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            {unreadNotifications.length > 0 
              ? `You have ${unreadNotifications.length} unread notification${unreadNotifications.length > 1 ? 's' : ''}`
              : "You're all caught up!"
            }
          </p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="unread" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="unread">
          {unreadNotifications.length === 0 ? (
            <EmptyState isUnread={true} />
          ) : (
            <NotificationList items={unreadNotifications} />
          )}
        </TabsContent>

        <TabsContent value="all">
          {notifications.length === 0 ? (
            <EmptyState isUnread={false} />
          ) : (
            <NotificationList items={notifications} showActions={false} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Alerts;