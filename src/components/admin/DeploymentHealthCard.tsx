import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Database, 
  Users, 
  MessageSquare, 
  Briefcase, 
  Megaphone,
  AlertTriangle,
  CheckCircle,
  GitBranch,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeploymentMetrics {
  orgId: string | null;
  userCount: number | null;
  announcementCount: number | null;
  conversationCount: number | null;
  projectCount: number | null;
  appVersion: string;
  gitSha: string;
  lastMigration: string | null;
  seedStatus: 'seeded' | 'partial' | 'empty' | 'unknown';
  failedQueries: string[];
}

export function DeploymentHealthCard() {
  const [metrics, setMetrics] = useState<DeploymentMetrics>({
    orgId: null,
    userCount: null,
    announcementCount: null,
    conversationCount: null,
    projectCount: null,
    appVersion: '1.0.0', // Could be from package.json or env
    gitSha: process.env.NODE_ENV === 'production' ? 'abcd123' : 'dev-build',
    lastMigration: null,
    seedStatus: 'unknown',
    failedQueries: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeploymentMetrics();
  }, []);

  const fetchDeploymentMetrics = async () => {
    const newMetrics: DeploymentMetrics = {
      ...metrics,
      failedQueries: []
    };

    try {
      // Get Organization ID
      try {
        const { data: orgData, error: orgError } = await supabase
          .rpc('get_default_org_id');
        
        if (orgError) throw orgError;
        newMetrics.orgId = orgData;
      } catch (error) {
        console.error('Failed to get org ID:', error);
        newMetrics.failedQueries.push('org_id');
      }

      // Get User Count
      try {
        const { count, error: userError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        if (userError) throw userError;
        newMetrics.userCount = count || 0;
      } catch (error) {
        console.error('Failed to get user count:', error);
        newMetrics.failedQueries.push('users');
      }

      // Get Announcement Count
      try {
        const { count, error: announcementError } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true });
        
        if (announcementError) throw announcementError;
        newMetrics.announcementCount = count || 0;
      } catch (error) {
        console.error('Failed to get announcement count:', error);
        newMetrics.failedQueries.push('announcements');
      }

      // Get Conversation Count
      try {
        const { count, error: conversationError } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true });
        
        if (conversationError) throw conversationError;
        newMetrics.conversationCount = count || 0;
      } catch (error) {
        console.error('Failed to get conversation count:', error);
        newMetrics.failedQueries.push('conversations');
      }

      // Get Project Count
      try {
        const { count, error: projectError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });
        
        if (projectError) throw projectError;
        newMetrics.projectCount = count || 0;
      } catch (error) {
        console.error('Failed to get project count:', error);
        newMetrics.failedQueries.push('projects');
      }

      // Check seed status by looking for default organization
      try {
        const { data: defaultOrg, error: seedError } = await supabase
          .from('organizations')
          .select('id')
          .limit(1)
          .single();

        if (seedError && seedError.code !== 'PGRST116') throw seedError;
        
        if (defaultOrg) {
          // Check if we have courses and other seed data
          const { count: courseCount } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });
          
          newMetrics.seedStatus = courseCount && courseCount > 0 ? 'seeded' : 'partial';
        } else {
          newMetrics.seedStatus = 'empty';
        }
      } catch (error) {
        console.error('Failed to check seed status:', error);
        newMetrics.seedStatus = 'unknown';
      }

      // Get last migration info (this is more complex, using a placeholder)
      // In a real app, you might store migration info in a custom table
      newMetrics.lastMigration = new Date().toISOString().split('T')[0]; // Today as placeholder

    } catch (error) {
      console.error('Error fetching deployment metrics:', error);
    }

    setMetrics(newMetrics);
    setLoading(false);
  };

  const getStatusBadge = (value: any, type: string) => {
    if (metrics.failedQueries.includes(type)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Error: {type}
        </Badge>
      );
    }
    
    if (value === null || value === undefined) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Loading
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        OK
      </Badge>
    );
  };

  const getSeedStatusBadge = () => {
    switch (metrics.seedStatus) {
      case 'seeded':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Seeded
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Partial
          </Badge>
        );
      case 'empty':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Empty
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Deployment Health
          </CardTitle>
          <CardDescription>System status and deployment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Deployment Health
        </CardTitle>
        <CardDescription>System status and deployment information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Organization & Version Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Organization ID
              </span>
              {getStatusBadge(metrics.orgId, 'org_id')}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {metrics.orgId || 'Failed to load'}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Version / SHA
              </span>
              <Badge variant="outline">
                {metrics.appVersion}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {metrics.gitSha}
            </p>
          </div>
        </div>

        {/* Data Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              {getStatusBadge(metrics.userCount, 'users')}
            </div>
            <div className="text-lg font-bold">
              {metrics.userCount ?? '–'}
            </div>
            <p className="text-xs text-muted-foreground">Users</p>
          </div>

          <div className="text-center p-3 border rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Megaphone className="h-4 w-4 text-orange-600" />
              {getStatusBadge(metrics.announcementCount, 'announcements')}
            </div>
            <div className="text-lg font-bold">
              {metrics.announcementCount ?? '–'}
            </div>
            <p className="text-xs text-muted-foreground">Announcements</p>
          </div>

          <div className="text-center p-3 border rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              {getStatusBadge(metrics.conversationCount, 'conversations')}
            </div>
            <div className="text-lg font-bold">
              {metrics.conversationCount ?? '–'}
            </div>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </div>

          <div className="text-center p-3 border rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              {getStatusBadge(metrics.projectCount, 'projects')}
            </div>
            <div className="text-lg font-bold">
              {metrics.projectCount ?? '–'}
            </div>
            <p className="text-xs text-muted-foreground">Projects</p>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Migration</span>
              <Badge variant="outline">
                {metrics.lastMigration || 'Unknown'}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seed Status</span>
              {getSeedStatusBadge()}
            </div>
          </div>
        </div>

        {/* Error Summary */}
        {metrics.failedQueries.length > 0 && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Query Failures ({metrics.failedQueries.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.failedQueries.map((table) => (
                <Badge key={table} variant="destructive">
                  {table}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}