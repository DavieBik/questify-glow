import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AdminAnalytics() {
  const { isAdmin, isManager } = useAuth();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  if (!isAdmin && !isManager) {
    return <Navigate to="/" replace />;
  }

  const handleRefreshMetrics = async () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can refresh analytics metrics",
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);
    try {
      const { error } = await supabase.rpc('refresh_analytics');
      if (error) throw error;
      
      toast({
        title: "Analytics Refreshed",
        description: "All analytics metrics have been updated successfully",
      });
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh analytics metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into learning performance and engagement
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={handleRefreshMetrics} 
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="skills-gap">Skills Gap</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="text-center py-8">Analytics Overview - Coming Soon</div>
        </TabsContent>

        <TabsContent value="team">
          <div className="text-center py-8">Team Analytics - Coming Soon</div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="text-center py-8">Course Analytics - Coming Soon</div>
        </TabsContent>

        <TabsContent value="modules">
          <div className="text-center py-8">Module Analytics - Coming Soon</div>
        </TabsContent>

        <TabsContent value="skills-gap">
          <div className="text-center py-8">Skills Gap Analysis - Coming Soon</div>
        </TabsContent>

        <TabsContent value="retention">
          <div className="text-center py-8">Retention Analytics - Coming Soon</div>
        </TabsContent>

        <TabsContent value="custom-reports">
          <div className="text-center py-8">Custom Reports - Coming Soon</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}