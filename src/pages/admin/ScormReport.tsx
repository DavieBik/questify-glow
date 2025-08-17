import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Download, RefreshCw, Search, Filter, Activity, FileText, Clock } from 'lucide-react';

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
  session_id: string;
}

interface ScormInteraction {
  id: string;
  element: string;
  value: string;
  ts: string;
}

const ScormReport: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [scormPackage, setScormPackage] = useState<ScormPackage | null>(null);
  const [reportData, setReportData] = useState<ScormReport[]>([]);
  const [filteredData, setFilteredData] = useState<ScormReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<ScormInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

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
          scorm_interactions(ts)
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
          user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
          email: user?.email || '',
          attempt: session.attempt,
          status: session.status,
          score: session.score || 0,
          total_time: String(session.total_time || '00:00:00'),
          started_at: session.started_at || null,
          ended_at: session.ended_at || null,
          last_interaction: lastInteraction || session.updated_at,
          session_id: session.id
        };
      });

      setReportData(formattedData);
      setFilteredData(formattedData);

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

  // Filter and search functionality
  useEffect(() => {
    let filtered = reportData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => 
        row.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(row => row.status === statusFilter);
    }

    setFilteredData(filtered);
  }, [reportData, searchTerm, statusFilter]);

  const exportToCsv = () => {
    if (!filteredData.length) return;

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
      ...filteredData.map(row => [
        `"${row.user_name}"`,
        `"${row.email}"`,
        row.attempt,
        `"${row.status}"`,
        row.score,
        `"${formatTimeForCsv(row.total_time)}"`,
        `"${formatDateForCsv(row.started_at)}"`,
        `"${formatDateForCsv(row.ended_at)}"`,
        `"${formatDateForCsv(row.last_interaction)}"`
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
      description: `SCORM report exported with ${filteredData.length} records`
    });
  };

  const loadSessionInteractions = async (sessionId: string) => {
    setLoadingInteractions(true);
    try {
      const { data, error } = await supabase
        .from('scorm_interactions')
        .select('*')
        .eq('session_id', sessionId)
        .order('ts', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session timeline',
        variant: 'destructive'
      });
    } finally {
      setLoadingInteractions(false);
    }
  };

  const openTimeline = (sessionId: string) => {
    setSelectedSession(sessionId);
    setTimelineOpen(true);
    loadSessionInteractions(sessionId);
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
    if (!timeString || timeString === '0' || timeString === '00:00:00') return '0:00:00';
    
    // Handle PostgreSQL interval format
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length === 3) {
        return timeString; // Already in HH:MM:SS format
      }
    }
    
    return timeString;
  };

  const formatTimeForCsv = (timeString: string) => {
    return formatTime(timeString);
  };

  const formatDateForCsv = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString();
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No learning sessions yet</h3>
      <p className="text-muted-foreground mb-4">
        {statusFilter !== 'all' || searchTerm 
          ? "No sessions match your current filters. Try adjusting your search or filter criteria."
          : "Learners haven't started this SCORM package yet. Sessions will appear here once learners begin their training."
        }
      </p>
      {(statusFilter !== 'all' || searchTerm) && (
        <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
          Clear Filters
        </Button>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!scormPackage) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Package not found</h3>
        <p className="text-muted-foreground mb-4">
          The SCORM package you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate('/admin/scorm')} variant="outline">
          Back to SCORM Packages
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/scorm')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to SCORM
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">SCORM Report</h1>
          <p className="text-muted-foreground">
            {scormPackage.title} (SCORM {scormPackage.version})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReportData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToCsv} disabled={!filteredData.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV ({filteredData.length})
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
          <div className="flex items-center justify-between">
            <CardTitle>Detailed Report</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search learners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredData.length !== reportData.length && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {reportData.length} sessions
            </p>
          )}
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Total Time</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{row.user_name}</div>
                          <div className="text-sm text-muted-foreground">Attempt #{row.attempt}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell>
                        {row.score ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.score}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatTime(row.total_time)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(row.last_interaction)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTimeline(row.session_id)}
                          className="text-primary hover:text-primary/80"
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          Timeline
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Timeline Sheet */}
      <Sheet open={timelineOpen} onOpenChange={setTimelineOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Session Timeline</SheetTitle>
            <SheetDescription>
              Recent SCORM interactions for this learning session
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {loadingInteractions ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No interactions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction, index) => (
                  <div key={interaction.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm truncate">
                          {interaction.element}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(interaction.ts).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 break-words">
                        {interaction.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ScormReport;