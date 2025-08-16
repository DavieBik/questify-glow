import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, BookOpen, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ApprovalRequest {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  reviewer_notes?: string;
  user_name: string;
  user_email: string;
  course_title: string;
  course_difficulty: string;
}

export const ApprovalsQueue = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && (isManager || isAdmin)) {
      fetchApprovals();
    } else {
      setLoading(false);
    }
  }, [user, isManager, isAdmin]);

  const fetchApprovals = async () => {
    if (!user) return;

    console.debug('[ApprovalsQueue] fetching pending approvals...', { userId: user.id });

    try {
      // First get approvals
      const { data: approvals, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;

      if (!approvals || approvals.length === 0) {
        setApprovals([]);
        return;
      }

      // Get unique user IDs and course IDs
      const userIds = [...new Set(approvals.map(a => a.user_id))];
      const courseIds = [...new Set(approvals.map(a => a.course_id))];

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Fetch courses data
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, difficulty')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // Create lookup maps
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      const coursesMap = new Map(coursesData?.map(c => [c.id, c]) || []);

      const processedApprovals = approvals.map(approval => {
        const user = usersMap.get(approval.user_id);
        const course = coursesMap.get(approval.course_id);
        
        return {
          id: approval.id,
          user_id: approval.user_id,
          course_id: approval.course_id,
          enrollment_id: approval.enrollment_id,
          request_type: approval.request_type,
          status: approval.status,
          requested_at: approval.requested_at,
          reviewer_notes: approval.reviewer_notes,
          user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown User',
          user_email: user?.email || 'unknown@example.com',
          course_title: course?.title || 'Unknown Course',
          course_difficulty: course?.difficulty || 'beginner',
        };
      });

      console.debug('[ApprovalsQueue] loaded approvals:', processedApprovals.length);
      setApprovals(processedApprovals);
    } catch (error: any) {
      console.error('[ApprovalsQueue] Error fetching approvals:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async (approvalId: string, status: 'approved' | 'denied') => {
    setProcessingId(approvalId);
    
    try {
      // Process approval in database
      const { error: processError } = await supabase.rpc('process_approval', {
        p_approval_id: approvalId,
        p_status: status,
        p_notes: notes[approvalId] || null
      });

      if (processError) throw processError;

      // Send notification email
      const approval = approvals.find(a => a.id === approvalId);
      if (approval) {
        const { error: emailError } = await supabase.functions.invoke('approval-email', {
          body: {
            approval_id: approvalId,
            type: status,
            user_email: approval.user_email,
            course_title: approval.course_title,
            reviewer_notes: notes[approvalId] || null
          }
        });

        if (emailError) {
          console.warn('[ApprovalsQueue] Email notification failed:', emailError);
        }
      }

      toast.success(`Request ${status} successfully`);
      
      // Remove from local state
      setApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      // Clear notes for this approval
      setNotes(prev => {
        const updated = { ...prev };
        delete updated[approvalId];
        return updated;
      });
    } catch (error: any) {
      console.error('[ApprovalsQueue] Error processing approval:', error);
      toast.error(`Failed to ${status} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const updateNotes = (approvalId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [approvalId]: value
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isManager && !isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Access denied. Manager or admin role required.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-muted rounded-lg"></div>
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
          <Clock className="h-5 w-5" />
          Approval Queue
        </CardTitle>
        <CardDescription>
          Review and process pending course enrollment requests ({approvals.length} pending)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.length > 0 ? (
          <div className="space-y-6">
            {approvals.map((approval) => (
              <div key={approval.id} className="p-6 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{approval.user_name}</span>
                      <span className="text-sm text-muted-foreground">({approval.user_email})</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{approval.course_title}</span>
                      <Badge className={getDifficultyColor(approval.course_difficulty)}>
                        {approval.course_difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Requested: {format(new Date(approval.requested_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>

                    <Badge variant="outline" className="w-fit">
                      {approval.request_type} request
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`notes-${approval.id}`}>Reviewer Notes (Optional)</Label>
                    <Textarea
                      id={`notes-${approval.id}`}
                      placeholder="Add any comments or feedback..."
                      value={notes[approval.id] || ''}
                      onChange={(e) => updateNotes(approval.id, e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => processApproval(approval.id, 'approved')}
                      disabled={processingId === approval.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {processingId === approval.id ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => processApproval(approval.id, 'denied')}
                      disabled={processingId === approval.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processingId === approval.id ? 'Processing...' : 'Deny'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No pending approvals</p>
            <p className="text-muted-foreground">All requests have been processed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};