import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, ArrowLeft, User, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Forum {
  id: string;
  title: string;
  description: string;
  course_id: string;
  created_at: string;
  courses: {
    title: string;
  };
}

interface ForumPost {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

const ForumDetail: React.FC = () => {
  const { forumId } = useParams<{ forumId: string }>();
  const { user } = useAuth();
  const [forum, setForum] = useState<Forum | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (forumId && user) {
      fetchForumAndPosts();
    }
  }, [forumId, user]);

  const fetchForumAndPosts = async () => {
    if (!forumId || !user) return;

    try {
      // Fetch forum details
      const { data: forumData, error: forumError } = await supabase
        .from('forums')
        .select(`
          *,
          courses(title)
        `)
        .eq('id', forumId)
        .single();

      if (forumError) throw forumError;
      setForum(forumData);

      // Fetch posts for this forum (without user join for now)
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('forum_id', forumId)
        .order('created_at', { ascending: true });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching forum and posts:', error);
      toast({
        title: "Error",
        description: "Failed to load forum. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!forumId || !user || !newPostContent.trim()) return;

    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          forum_id: forumId,
          user_id: user.id,
          content: newPostContent.trim()
        })
        .select('*')
        .single();

      if (error) throw error;

      setPosts(prev => [...prev, data]);
      setNewPostContent('');

      toast({
        title: "Success",
        description: "Your post has been added!",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
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

  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Forum Not Found</h1>
          <p className="text-muted-foreground">The requested forum could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to={`/courses/${forum.course_id}/forums`}
          className="flex items-center text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Forums
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{forum.title}</h1>
        <p className="text-muted-foreground">
          Forum in <Link 
            to={`/courses/${forum.course_id}`} 
            className="hover:text-primary hover:underline"
          >
            {forum.courses?.title}
          </Link>
        </p>
        {forum.description && (
          <p className="text-sm text-muted-foreground mt-2">{forum.description}</p>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share your thoughts in this forum.
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post, index) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(post.users?.first_name, post.users?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {post.users?.first_name} {post.users?.last_name || 'Anonymous'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(post.created_at)}</span>
                      {index === 0 && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">Original Post</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {post.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Post Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Your Response</CardTitle>
          <CardDescription>
            Share your thoughts and engage with other learners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Write your response here..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleCreatePost}
              disabled={posting || !newPostContent.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {posting ? 'Posting...' : 'Post Response'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForumDetail;