import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Megaphone, 
  Pin, 
  Clock, 
  Users, 
  Plus,
  AlertTriangle,
  Info,
  CheckCircle,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  course_id?: string;
  created_by: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  course?: {
    title: string;
  };
  is_read?: boolean;
  read_stats?: {
    total_readers: number;
    total_eligible: number;
    read_percentage: number;
  };
}

const Announcements: React.FC = () => {
  const { user, canEdit } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async (pageNum = 0, append = false) => {
    console.debug('[Announcements] fetching...', { userId: user?.id, page: pageNum, pageSize: PAGE_SIZE });
    try {
      if (!append) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }
      
      // Simple fetch without FK joins - same pattern as Messages/GroupProjects
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, priority, is_pinned, created_at, updated_at, created_by, course_id, expires_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      console.debug('[Announcements] fetched announcements:', data?.length || 0);

      // Handle pagination
      setHasMore(data?.length === PAGE_SIZE);
      
      if (!data || data.length === 0) {
        if (!append) {
          setAnnouncements([]);
        }
        return;
      }

      // Get unique creator and course IDs for follow-up fetches
      const creatorIds = [...new Set(data.map(a => a.created_by).filter(Boolean))];
      const courseIds = [...new Set(data.map(a => a.course_id).filter(Boolean))];

      // Fetch creators separately (lightweight)
      const creators: Record<string, any> = {};
      if (creatorIds.length > 0) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .in('id', creatorIds);
        
        creatorData?.forEach(creator => {
          creators[creator.id] = creator;
        });
      }

      // Fetch courses separately (lightweight)
      const courses: Record<string, any> = {};
      if (courseIds.length > 0) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        
        courseData?.forEach(course => {
          courses[course.id] = course;
        });
      }

      // Check read status for current user
      const readStatuses: Record<string, boolean> = {};
      if (user?.id) {
        const { data: readData } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)
          .in('announcement_id', data.map(a => a.id));
        
        readData?.forEach(read => {
          readStatuses[read.announcement_id] = true;
        });
      }

      // Get read statistics if user can edit (optional enhancement)
      const readStats: Record<string, any> = {};
      if (canEdit) {
        for (const announcement of data) {
          try {
            const { data: statsData } = await supabase
              .rpc('get_announcement_stats', { 
                announcement_id_param: announcement.id 
              })
              .single();
            if (statsData) {
              readStats[announcement.id] = statsData;
            }
          } catch (error) {
            console.debug('Failed to get stats for announcement:', announcement.id);
          }
        }
      }

      // Combine all data
      const enrichedAnnouncements = data.map(announcement => ({
        ...announcement,
        priority: announcement.priority as 'low' | 'normal' | 'high' | 'urgent',
        creator: announcement.created_by ? creators[announcement.created_by] : undefined,
        course: announcement.course_id ? courses[announcement.course_id] : undefined,
        is_read: !!readStatuses[announcement.id],
        read_stats: readStats[announcement.id]
      }));

      // Update state with new data
      if (append) {
        setAnnouncements(prev => [...prev, ...enrichedAnnouncements]);
        setPage(pageNum);
      } else {
        setAnnouncements(enrichedAnnouncements);
        setPage(0);
      }
      
      console.debug('[Announcements] successfully loaded:', enrichedAnnouncements.length);
      
    } catch (error) {
      console.error('[Announcements] Error fetching:', error);
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    await fetchAnnouncements(page + 1, true);
  };

  const markAsRead = async (announcementId: string) => {
    try {
      await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user?.id
        });

      // Update local state
      setAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId 
            ? { ...ann, is_read: true }
            : ann
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'normal':
        return 'outline';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    if (!announcement.is_read) {
      markAsRead(announcement.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest course and platform news
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No announcements yet</div>
              <div className="text-sm">
                {canEdit 
                  ? "Create your first announcement to keep everyone informed"
                  : "Check back later for updates"
                }
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id}
              className={`transition-all hover:shadow-md cursor-pointer ${
                !announcement.is_read ? 'ring-2 ring-primary/20' : ''
              } ${
                isExpired(announcement.expires_at) ? 'opacity-60' : ''
              }`}
              onClick={() => handleAnnouncementClick(announcement)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(announcement.priority)}
                      {announcement.is_pinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                      {!announcement.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>
                          By {announcement.creator?.first_name} {announcement.creator?.last_name}
                        </span>
                        {announcement.course && (
                          <>
                            <span>•</span>
                            <span>{announcement.course.title}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                    {announcement.expires_at && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(announcement.expires_at), 'MMM d')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </div>
                
                {canEdit && announcement.read_stats && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>
                          {announcement.read_stats.total_readers} of {announcement.read_stats.total_eligible} read
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{announcement.read_stats.read_percentage}% read rate</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={loadMore} 
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}

      <CreateAnnouncementDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAnnouncementCreated={() => fetchAnnouncements(0, false)}
      />
    </div>
  );
};

export default Announcements;