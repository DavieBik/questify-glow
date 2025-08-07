import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Plus, User, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Forum {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  post_count?: number;
}

interface Course {
  id: string;
  title: string;
}

const CourseForums: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newForumTitle, setNewForumTitle] = useState('');
  const [newForumDescription, setNewForumDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseAndForums();
    }
  }, [courseId, user]);

  const fetchCourseAndForums = async () => {
    if (!courseId || !user) return;

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch forums for this course
      const { data: forumsData, error: forumsError } = await supabase
        .from('forums')
        .select(`
          *,
          forum_posts(count)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (forumsError) throw forumsError;

      const forumsWithCounts = forumsData?.map(forum => ({
        ...forum,
        post_count: forum.forum_posts?.[0]?.count || 0
      })) || [];

      setForums(forumsWithCounts);
    } catch (error) {
      console.error('Error fetching course and forums:', error);
      toast({
        title: "Error",
        description: "Failed to load forums. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForum = async () => {
    if (!courseId || !user || !newForumTitle.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('forums')
        .insert({
          course_id: courseId,
          title: newForumTitle.trim(),
          description: newForumDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setForums(prev => [{ ...data, post_count: 0 }, ...prev]);
      setNewForumTitle('');
      setNewForumDescription('');
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "Forum created successfully!",
      });
    } catch (error) {
      console.error('Error creating forum:', error);
      toast({
        title: "Error",
        description: "Failed to create forum. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <p className="text-muted-foreground">The requested course could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Course Forums</h1>
          <p className="text-muted-foreground mt-2">{course.title}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Forum
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Forum</DialogTitle>
              <DialogDescription>
                Start a new discussion topic for this course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Enter forum title..."
                  value={newForumTitle}
                  onChange={(e) => setNewForumTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  placeholder="Describe what this forum is about..."
                  value={newForumDescription}
                  onChange={(e) => setNewForumDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateForum} 
                disabled={creating || !newForumTitle.trim()}
              >
                {creating ? 'Creating...' : 'Create Forum'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {forums.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Forums Yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to start a discussion for this course.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Forum
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forums.map((forum) => (
            <Card key={forum.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      <Link 
                        to={`/forums/${forum.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {forum.title}
                      </Link>
                    </CardTitle>
                    {forum.description && (
                      <CardDescription className="mt-2">
                        {forum.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{forum.post_count} posts</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Created by user</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(forum.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Link 
          to={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to Course
        </Link>
      </div>
    </div>
  );
};

export default CourseForums;