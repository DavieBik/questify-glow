import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  pending_approvals: number;
  overdue_courses: number;
  completion_rate: number;
}

export const TeamViewWidget = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && (isManager || isAdmin)) {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [user, isManager, isAdmin]);

  const fetchTeamData = async () => {
    if (!user) return;

    console.debug('[TeamView] fetching team data...', { userId: user.id });

    try {
      // Fetch team members from the same organization
      // First get the current user's org_id
      const { data: currentUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!currentUser?.organization_id) {
        console.error('[TeamView] User has no organization');
        return;
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('organization_id', currentUser.organization_id)
        .neq('id', user.id)
        .eq('is_active', true)
        .limit(5);

      if (error) throw error;

      // For each team member, fetch their course stats
      const teamMembersWithStats = await Promise.all(
        (users || []).map(async (member) => {
          const [enrollmentsResult, certificatesResult] = await Promise.all([
            supabase
              .from('user_course_enrollments')
              .select('id, status, progress_percentage, enrollment_date, courses(is_mandatory)')
              .eq('user_id', member.id),
            supabase
              .from('certificates')
              .select('id')
              .eq('user_id', member.id)
          ]);

          const enrollments = enrollmentsResult.data || [];
          const certificates = certificatesResult.data || [];

          // Calculate pending approvals (completed courses without certificates)
          const pendingApprovals = enrollments.filter(e => 
            e.status === 'completed' && e.progress_percentage >= 100
          ).length - certificates.length;

          // Calculate overdue courses (enrolled > 30 days ago, not completed, mandatory)
          const now = new Date();
          const overdueThreshold = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          const overdueCourses = enrollments.filter(e => {
            const enrollmentDate = new Date(e.enrollment_date);
            return enrollmentDate < overdueThreshold && 
                   e.status !== 'completed' && 
                   e.courses?.is_mandatory;
          }).length;

          // Calculate completion rate
          const totalEnrollments = enrollments.length;
          const completedCourses = enrollments.filter(e => e.status === 'completed').length;
          const completionRate = totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0;

          return {
            id: member.id,
            name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
            email: member.email,
            pending_approvals: Math.max(0, pendingApprovals),
            overdue_courses: overdueCourses,
            completion_rate: Math.round(completionRate),
          };
        })
      );

      console.debug('[TeamView] loaded team members:', teamMembersWithStats.length);
      setTeamMembers(teamMembersWithStats);
    } catch (error: any) {
      console.error('[TeamView] Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    
    try {
      const { error } = await supabase.functions.invoke('approve-completions', {
        body: { user_id: memberId }
      });

      if (error) throw error;

      toast.success('Approvals processed successfully');
      fetchTeamData(); // Refresh data
    } catch (error: any) {
      console.error('[TeamView] Error approving completions:', error);
      toast.error('Failed to process approvals');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (memberId: string) => {
    setActionLoading(memberId);
    
    try {
      const { error } = await supabase.functions.invoke('send-reminder', {
        body: { 
          user_id: memberId,
          reminder_type: 'overdue_courses'
        }
      });

      if (error) throw error;

      toast.success('Reminder sent successfully');
    } catch (error: any) {
      console.error('[TeamView] Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isManager && !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Overview
        </CardTitle>
        <CardDescription>
          Monitor your team's learning progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teamMembers.length > 0 ? (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{member.completion_rate}%</span>
                    <p className="text-xs text-muted-foreground">completion</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  {member.pending_approvals > 0 && (
                    <Badge variant="secondary">
                      {member.pending_approvals} pending approval{member.pending_approvals !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {member.overdue_courses > 0 && (
                    <Badge variant="destructive">
                      {member.overdue_courses} overdue
                    </Badge>
                  )}
                  {member.pending_approvals === 0 && member.overdue_courses === 0 && (
                    <Badge variant="outline">Up to date</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {member.pending_approvals > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {actionLoading === member.id ? 'Processing...' : 'Approve'}
                    </Button>
                  )}
                  {member.overdue_courses > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemind(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {actionLoading === member.id ? 'Sending...' : 'Remind'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No team members found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};