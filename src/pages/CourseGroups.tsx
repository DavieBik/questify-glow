import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, UserPlus, UserCheck, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface Course {
  id: string;
  title: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  joined_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

const CourseGroups: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseAndGroups();
    }
  }, [courseId, user]);

  const fetchCourseAndGroups = async () => {
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

      // Fetch groups for this course
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Check which groups the user is a member of
      const { data: userMemberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const memberGroupIds = new Set(userMemberships?.map(m => m.group_id) || []);

      const groupsWithMemberInfo = groupsData?.map(group => ({
        ...group,
        member_count: group.group_members?.[0]?.count || 0,
        is_member: memberGroupIds.has(group.id)
      })) || [];

      setGroups(groupsWithMemberInfo);
    } catch (error) {
      console.error('Error fetching course and groups:', error);
      toast({
        title: "Error",
        description: "Failed to load study groups. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!courseId || !user || !newGroupName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          course_id: courseId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically join the creator to the group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: data.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      setGroups(prev => [{ ...data, member_count: 1, is_member: true }, ...prev]);
      setNewGroupName('');
      setNewGroupDescription('');
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "Study group created successfully!",
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create study group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id
        });

      if (error) throw error;

      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, member_count: group.member_count! + 1, is_member: true }
          : group
      ));

      toast({
        title: "Success",
        description: "You've joined the study group!",
      });
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: "Error",
        description: "Failed to join study group. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, member_count: Math.max(0, group.member_count! - 1), is_member: false }
          : group
      ));

      toast({
        title: "Success",
        description: "You've left the study group.",
      });
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: "Error",
        description: "Failed to leave study group. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
          <h1 className="text-3xl font-bold">Study Groups</h1>
          <p className="text-muted-foreground mt-2">{course.title}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Group</DialogTitle>
              <DialogDescription>
                Start a new study group for collaborative learning.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  placeholder="Describe your study group..."
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
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
                onClick={handleCreateGroup} 
                disabled={creating || !newGroupName.trim()}
              >
                {creating ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Study Groups Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create the first study group for collaborative learning.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{group.member_count} members</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.description && (
                  <p className="text-sm text-muted-foreground">
                    {group.description}
                  </p>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Created {formatDate(group.created_at)}</span>
                </div>

                <div className="flex gap-2">
                  {group.is_member ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleLeaveGroup(group.id)}
                      className="flex-1"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Leave Group
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinGroup(group.id)}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Group
                    </Button>
                  )}
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

export default CourseGroups;