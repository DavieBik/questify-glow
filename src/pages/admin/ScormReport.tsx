import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';

interface ScormPackage {
  id: string;
  title: string;
  version: string;
}

interface ScormReport {
  user_id: string;
  user_name: string;
  email: string;
  attempt: number;
  status: string;
  score: number;
  total_time: string;
  started_at: string | null;
  ended_at: string | null;
  last_interaction: string;
}

const ScormReport: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [scormPackage, setScormPackage] = useState<ScormPackage | null>(null);
  const [reportData, setReportData] = useState<ScormReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (packageId) {
      loadReportData();
    }
  }, [packageId]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Load package details
      const { data: packageData, error: packageError } = await supabase
        .from('scorm_packages')
        .select('id, title, version')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;
      setScormPackage(packageData);

      // Load report data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('scorm_sessions')
        .select(`
          *,
          scorm_interactions!inner(ts)
        `)
        .eq('package_id', packageId)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get user details for each session
      const userIds = [...new Set(sessionsData.map(s => s.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Format report data
      const formattedData: ScormReport[] = sessionsData.map(session => {
        const user = usersMap.get(session.user_id);
        const lastInteraction = session.scorm_interactions?.[0]?.ts;
        
        return {
          user_id: session.user_id,
          user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
          email: user?.email || '',
          attempt: session.attempt,
          status: session.status,
          score: session.score || 0,
          total_time: session.total_time?.toString() || '0:00',
          started_at: session.started_at || null,
          ended_at: session.ended_at || null,
          last_interaction: lastInteraction || session.updated_at
        };
      });

      setReportData(formattedData);

    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SCORM report data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!reportData.length) return;

    const headers = [
      'User Name',
      'Email',
      'Attempt',
      'Status',
      'Score (%)',
      'Total Time',
      'Started At',
      'Ended At',
      'Last Interaction'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        `"${row.user_name}"`,
        `"${row.email}"`,
        row.attempt,
        `"${row.status}"`,
        row.score,
        `"${row.total_time}"`,
        `"${row.started_at || ''}"`,
        `"${row.ended_at || ''}"`,
        `"${row.last_interaction || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scorm-report-${scormPackage?.title || 'package'}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: 'SCORM report has been downloaded as CSV'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'completed': 'default',
      'in_progress': 'secondary', 
      'failed': 'destructive',
      'not_started': 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString();
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === '0') return '0:00';
    return timeString;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!scormPackage) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">SCORM package not found</p>
        <Button onClick={() => navigate('/admin/courses')} className="mt-4">
          Back to Admin
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">SCORM Report</h1>
          <p className="text-muted-foreground">
            {scormPackage.title} (SCORM {scormPackage.version})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReportData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCsv} disabled={!reportData.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{reportData.length}</div>
              <div className="text-sm text-muted-foreground">Total Attempts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {reportData.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {reportData.filter(r => r.status === 'in_progress').length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {reportData.length > 0 
                  ? Math.round((reportData.filter(r => r.status === 'completed').length / reportData.length) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Report</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No learning sessions found for this SCORM package</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.user_name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.attempt}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell>{row.score ? `${row.score}%` : '-'}</TableCell>
                      <TableCell>{formatTime(row.total_time)}</TableCell>
                      <TableCell>{formatDate(row.started_at)}</TableCell>
                      <TableCell>{formatDate(row.ended_at)}</TableCell>
                      <TableCell>{formatDate(row.last_interaction)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScormReport;