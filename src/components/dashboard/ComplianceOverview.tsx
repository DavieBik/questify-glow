import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { withErrorHandling } from '@/utils/error-handling';
import { Link } from 'react-router-dom';

interface ComplianceData {
  requiredTotal: number;
  requiredCompleted: number;
  nextDue: {
    course_title: string;
    due_date: string;
    course_id: string;
  } | null;
  overdue: number;
}

export function ComplianceOverview() {
  const { user } = useAuth();
  const [compliance, setCompliance] = useState<ComplianceData>({
    requiredTotal: 0,
    requiredCompleted: 0,
    nextDue: null,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchComplianceData();
    }
  }, [user]);

  const fetchComplianceData = async () => {
    await withErrorHandling(async () => {
      // Fetch required course enrollments
      const { data: enrollments, error } = await supabase
        .from('user_course_enrollments')
        .select(`
          id,
          status,
          due_at,
          courses!inner (
            id,
            title,
            is_mandatory
          )
        `)
        .eq('user_id', user?.id)
        .eq('courses.is_mandatory', true);

      if (error) throw error;

      const total = enrollments?.length || 0;
      const completed = enrollments?.filter(e => e.status === 'completed').length || 0;
      const overdue = enrollments?.filter(e => 
        e.due_at && new Date(e.due_at) < new Date() && e.status !== 'completed'
      ).length || 0;

      // Find next due course
      const upcomingDue = enrollments
        ?.filter(e => e.due_at && e.status !== 'completed')
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];

      setCompliance({
        requiredTotal: total,
        requiredCompleted: completed,
        overdue,
        nextDue: upcomingDue ? {
          course_title: upcomingDue.courses.title,
          due_date: upcomingDue.due_at!,
          course_id: upcomingDue.courses.id,
        } : null,
      });
    });
    setLoading(false);
  };

  const completionPercentage = compliance.requiredTotal > 0 
    ? Math.round((compliance.requiredCompleted / compliance.requiredTotal) * 100) 
    : 0;

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Training Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Required Training</span>
            <span className="text-sm text-muted-foreground">
              {compliance.requiredCompleted}/{compliance.requiredTotal} completed
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completionPercentage}% complete
          </p>
        </div>

        {/* Overdue Alert */}
        {compliance.overdue > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              {compliance.overdue} overdue training{compliance.overdue !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Next Due */}
        {compliance.nextDue && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next Due
            </h4>
            <Link 
              to={`/courses/${compliance.nextDue.course_id}`}
              className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{compliance.nextDue.course_title}</p>
                  <Badge 
                    variant={new Date(compliance.nextDue.due_date) < new Date() ? "destructive" : "secondary"}
                    className="mt-1"
                  >
                    {formatDueDate(compliance.nextDue.due_date)}
                  </Badge>
                </div>
              </div>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}