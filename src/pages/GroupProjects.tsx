import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  Calendar,
  FileText,
  Star,
  CheckCircle,
  Clock,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { CreateTeamDialog } from '@/components/projects/CreateTeamDialog';
import { ProjectSubmissionDialog } from '@/components/projects/ProjectSubmissionDialog';

interface Project {
  id: string;
  title: string;
  description: string;
  course_id: string;
  created_by: string;
  max_team_size: number;
  min_team_size: number;
  due_date?: string;
  submission_format?: 'file' | 'link' | 'text';
  instructions?: string;
  is_active: boolean;
  allow_self_enrollment: boolean;
  created_at: string;
  course?: {
    title: string;
  };
  user_team?: {
    id: string;
    name: string;
    role: string;
  };
}

interface Team {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  created_by: string;
  is_full: boolean;
  created_at: string;
  project?: {
    title: string;
  };
  members?: {
    user_id: string;
    role: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  }[];
  member_count?: number;
}

interface Submission {
  id: string;
  team_id: string;
  submitted_by: string;
  content?: string;
  file_url?: string;
  link_url?: string;
  submission_type: 'file' | 'link' | 'text';
  is_final: boolean;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  team?: {
    name: string;
    project: {
      title: string;
    };
  };
}

const GroupProjects: React.FC = () => {
  const { user, canEdit } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    await Promise.all([
      fetchProjects(),
      fetchTeams(),
      fetchSubmissions()
    ]);
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          courses(title),
          project_teams!inner(
            id,
            name,
            team_members!inner(user_id, role)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process projects to include user team information
      const projectsWithTeams = (data || []).map(project => {
        const userTeam = project.project_teams.find((team: any) =>
          team.team_members.some((member: any) => member.user_id === user?.id)
        );

        return {
          ...project,
          submission_format: project.submission_format as 'file' | 'link' | 'text' | undefined,
          course: project.courses,
          user_team: userTeam ? {
            id: userTeam.id,
            name: userTeam.name,
            role: userTeam.team_members.find((m: any) => m.user_id === user?.id)?.role
          } : undefined
        };
      });

      setProjects(projectsWithTeams);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('project_teams')
        .select(`
          *,
          projects(title),
          team_members(
            user_id,
            role,
            users(first_name, last_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithDetails = (data || []).map(team => ({
        ...team,
        project: team.projects,
        members: team.team_members.map((member: any) => ({
          user_id: member.user_id,
          role: member.role,
          user: member.users
        })),
        member_count: team.team_members.length
      }));

      setTeams(teamsWithDetails);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('project_submissions')
        .select(`
          *,
          project_teams(
            name,
            projects(title)
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const submissionsWithDetails = (data || []).map(submission => ({
        ...submission,
        submission_type: submission.submission_type as 'file' | 'link' | 'text',
        team: submission.project_teams ? {
          name: (submission.project_teams as any).name,
          project: (submission.project_teams as any).projects
        } : undefined
      }));

      setSubmissions(submissionsWithDetails);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const joinTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user?.id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "You've joined the team!",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      });
    }
  };

  const getDueDateBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (daysUntilDue <= 3) {
      return <Badge variant="secondary">Due in {daysUntilDue} days</Badge>;
    } else {
      return <Badge variant="outline">Due {format(date, 'MMM d')}</Badge>;
    }
  };

  const handleCreateTeam = (project: Project) => {
    setSelectedProject(project);
    setCreateTeamOpen(true);
  };

  const handleSubmission = (team: Team) => {
    setSelectedTeam(team);
    setSubmissionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Group Projects</h1>
          <p className="text-muted-foreground">
            Collaborate with your peers on exciting learning projects
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateProjectOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="available" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Available Projects</TabsTrigger>
          <TabsTrigger value="my-teams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Teams</TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">No projects available</div>
                  <div className="text-sm">
                    {canEdit 
                      ? "Create your first group project to get started"
                      : "Check back later for new projects"
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {project.title}
                          {project.user_team && (
                            <Badge variant="default">
                              In Team: {project.user_team.name}
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          {project.course?.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDueDateBadge(project.due_date)}
                        <Badge variant="outline">
                          {project.min_team_size}-{project.max_team_size} members
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground mb-4 whitespace-pre-wrap">
                      {project.description}
                    </p>
                    
                    {project.instructions && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium text-sm">Instructions</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{project.instructions}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {project.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due {format(new Date(project.due_date), 'PPP')}</span>
                          </div>
                        )}
                        {project.submission_format && (
                          <div className="flex items-center gap-1">
                            <Upload className="h-4 w-4" />
                            <span>Submit via {project.submission_format}</span>
                          </div>
                        )}
                      </div>
                      
                      {!project.user_team && project.allow_self_enrollment && (
                        <Button 
                          onClick={() => handleCreateTeam(project)}
                          size="sm"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Create Team
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-teams" className="space-y-4">
          {teams.filter(team => team.members?.some(m => m.user_id === user?.id)).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">No teams yet</div>
                  <div className="text-sm">Join or create a team to get started</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {teams
                .filter(team => team.members?.some(m => m.user_id === user?.id))
                .map((team) => (
                  <Card key={team.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{team.name}</CardTitle>
                          <div className="text-sm text-muted-foreground mt-1">
                            Project: {team.project?.title}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={team.is_full ? "secondary" : "outline"}>
                            {team.member_count} members
                          </Badge>
                          {team.members?.find(m => m.user_id === user?.id)?.role === 'leader' && (
                            <Badge variant="default">Team Leader</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {team.description && (
                        <p className="text-foreground mb-4">{team.description}</p>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">Team Members</h4>
                          <div className="space-y-2">
                            {team.members?.map((member) => (
                              <div key={member.user_id} className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">
                                    {member.user.first_name} {member.user.last_name}
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({member.user.email})
                                  </span>
                                </div>
                                <Badge variant={member.role === 'leader' ? 'default' : 'outline'}>
                                  {member.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button 
                            onClick={() => handleSubmission(team)}
                            size="sm"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Submit Work
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">No submissions yet</div>
                  <div className="text-sm">Submit your team's work to see it here</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {submission.team?.project.title}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          Team: {submission.team?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={submission.is_final ? 'default' : 'outline'}>
                          {submission.is_final ? 'Final' : 'Draft'}
                        </Badge>
                        {submission.grade && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            {submission.grade}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Submitted on {format(new Date(submission.submitted_at), 'PPP')}
                      </div>
                      
                      {submission.content && (
                        <div>
                          <h4 className="font-medium mb-2">Content</h4>
                          <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                            {submission.content}
                          </p>
                        </div>
                      )}
                      
                      {submission.file_url && (
                        <div>
                          <h4 className="font-medium mb-2">File</h4>
                          <a 
                            href={submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View submitted file
                          </a>
                        </div>
                      )}
                      
                      {submission.link_url && (
                        <div>
                          <h4 className="font-medium mb-2">Link</h4>
                          <a 
                            href={submission.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {submission.link_url}
                          </a>
                        </div>
                      )}
                      
                      {submission.feedback && (
                        <div>
                          <h4 className="font-medium mb-2">Feedback</h4>
                          <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                            {submission.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onProjectCreated={fetchData}
      />

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        project={selectedProject}
        onTeamCreated={fetchData}
      />

      <ProjectSubmissionDialog
        open={submissionDialogOpen}
        onOpenChange={setSubmissionDialogOpen}
        team={selectedTeam}
        onSubmissionCreated={fetchData}
      />
    </div>
  );
};

export default GroupProjects;