import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EnrolmentButtonProps {
  courseId: string;
  courseTitle: string;
  requiresApproval?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const EnrolmentButton = ({ 
  courseId, 
  courseTitle, 
  requiresApproval = false,
  className,
  children = "Enrol"
}: EnrolmentButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnrolment = async () => {
    if (!user) {
      toast.error('Please log in to enrol');
      return;
    }

    setLoading(true);

    try {
      // Create enrolment record
      const { data: enrolment, error: enrolmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: requiresApproval ? 'pending_approval' : 'enrolled'
        })
        .select()
        .single();

      if (enrolmentError) {
        if (enrolmentError.code === '23505') { // Unique constraint violation
          toast.error('You are already enrolled in this course');
          return;
        }
        throw enrolmentError;
      }

      if (requiresApproval) {
        // Create approval request
        const { data: approval, error: approvalError } = await supabase.rpc(
          'create_approval_request',
          {
            p_user_id: user.id,
            p_enrollment_id: enrolment.id,
            p_course_id: courseId,
            p_request_type: 'enrolment'
          }
        );

        if (approvalError) throw approvalError;

        // Send notification email to managers
        const { error: emailError } = await supabase.functions.invoke('approval-email', {
          body: {
            approval_id: approval,
            type: 'request',
            user_email: user.email,
            course_title: courseTitle
          }
        });

        if (emailError) {
          console.warn('[EnrolmentButton] Email notification failed:', emailError);
        }

        toast.success('Enrolment request submitted for approval');
      } else {
        toast.success('Successfully enrolled in course');
      }
    } catch (error: any) {
      console.error('[EnrolmentButton] Error during enrolment:', error);
      toast.error('Failed to enrol in course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleEnrolment} 
      disabled={loading}
      className={className}
    >
      {loading ? 'Processing...' : children}
    </Button>
  );
};