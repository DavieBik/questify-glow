import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EnrollmentButtonProps {
  courseId: string;
  courseTitle: string;
  requiresApproval?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const EnrollmentButton = ({ 
  courseId, 
  courseTitle, 
  requiresApproval = false,
  className,
  children = "Enroll"
}: EnrollmentButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnrollment = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      return;
    }

    setLoading(true);

    try {
      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: requiresApproval ? 'pending_approval' : 'enrolled'
        })
        .select()
        .single();

      if (enrollmentError) {
        if (enrollmentError.code === '23505') { // Unique constraint violation
          toast.error('You are already enrolled in this course');
          return;
        }
        throw enrollmentError;
      }

      if (requiresApproval) {
        // Create approval request
        const { data: approval, error: approvalError } = await supabase.rpc(
          'create_approval_request',
          {
            p_user_id: user.id,
            p_enrollment_id: enrollment.id,
            p_course_id: courseId,
            p_request_type: 'enrollment'
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
          console.warn('[EnrollmentButton] Email notification failed:', emailError);
        }

        toast.success('Enrollment request submitted for approval');
      } else {
        toast.success('Successfully enrolled in course');
      }
    } catch (error: any) {
      console.error('[EnrollmentButton] Error during enrollment:', error);
      toast.error('Failed to enroll in course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleEnrollment} 
      disabled={loading}
      className={className}
    >
      {loading ? 'Processing...' : children}
    </Button>
  );
};