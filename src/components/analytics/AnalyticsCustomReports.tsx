import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Play, Download, Share, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SavedReport {
  id: string;
  name: string;
  description: string;
  dataset: string;
  filters: any;
  columns: string[];
  shared: boolean;
  owner_id: string;
  created_at: string;
}

interface ReportBuilder {
  name: string;
  description: string;
  dataset: string;
  selectedColumns: string[];
  filters: any;
}

const DATASETS = {
  user_progress: {
    name: "User Progress",
    columns: ["user_name", "course_title", "progress_pct", "avg_score", "time_spent_minutes", "last_activity_at"]
  },
  course_metrics: {
    name: "Course Metrics", 
    columns: ["course_title", "learners", "completion_rate", "avg_score", "avg_time_minutes"]
  },
  module_metrics: {
    name: "Module Metrics",
    columns: ["module_title", "course_title", "attempts", "pass_rate", "avg_score", "dropoff_rate"]
  },
  skills_gap: {
    name: "Skills Gap",
    columns: ["user_name", "course_title", "status", "due_date", "mandatory"]
  }
};

export function AnalyticsCustomReports() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [reportBuilder, setReportBuilder] = useState<ReportBuilder>({
    name: "",
    description: "",
    dataset: "",
    selectedColumns: [],
    filters: {}
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isAdmin, isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedReports();
  }, []);

  const fetchSavedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_saved_reports')
        .select('*')
        .or(`owner_id.eq.${user?.id},shared.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedReports(data || []);
    } catch (error) {
      console.error("Error fetching saved reports:", error);
    }
  };

  const saveReport = async () => {
    if (!reportBuilder.name || !reportBuilder.dataset || reportBuilder.selectedColumns.length === 0) {
      toast({
        title: "Invalid Report",
        description: "Please provide a name, select a dataset, and choose at least one column.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('analytics_saved_reports')
        .insert({
          name: reportBuilder.name,
          description: reportBuilder.description,
          dataset: reportBuilder.dataset,
          filters: reportBuilder.filters,
          columns: reportBuilder.selectedColumns,
          owner_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report saved successfully.",
      });

      setIsBuilderOpen(false);
      setReportBuilder({
        name: "",
        description: "",
        dataset: "",
        selectedColumns: [],
        filters: {}
      });
      fetchSavedReports();
    } catch (error) {
      console.error("Error saving report:", error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runReport = async (report: SavedReport) => {
    setLoading(true);
    setCurrentReport(report);
    
    try {
      let data: any[] = [];
      
      switch (report.dataset) {
        case 'user_progress':
          const { data: progressData } = await supabase.rpc('rpc_admin_team_user_progress', {
            date_from: '2024-01-01',
            date_to: format(new Date(), 'yyyy-MM-dd'),
            manager_scope: isManager && !isAdmin
          });
          data = progressData || [];
          break;
          
        case 'course_metrics':
          const { data: courseData } = await supabase.rpc('rpc_course_metrics', {
            date_from: '2024-01-01',
            date_to: format(new Date(), 'yyyy-MM-dd')
          });
          data = courseData || [];
          break;
          
        case 'module_metrics':
          const { data: moduleData } = await supabase.rpc('rpc_module_metrics', {
            course_id: null,
            date_from: '2024-01-01',
            date_to: format(new Date(), 'yyyy-MM-dd')
          });
          data = moduleData || [];
          break;
          
        case 'skills_gap':
          const { data: skillsData } = await supabase.rpc('rpc_skills_gap', {
            manager_scope: isManager && !isAdmin
          });
          data = skillsData || [];
          break;
      }

      // Filter data based on selected columns
      const filteredData = data.map(row => {
        const filteredRow: any = {};
        report.columns.forEach(col => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });

      setReportData(filteredData);
    } catch (error) {
      console.error("Error running report:", error);
      toast({
        title: "Error",
        description: "Failed to run report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!currentReport || reportData.length === 0) return;

    const headers = currentReport.columns;
    const csvContent = [
      headers.join(","),
      ...reportData.map(row => 
        headers.map(header => row[header] || '').join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentReport.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('analytics_saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted successfully.",
      });

      fetchSavedReports();
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
        setReportData([]);
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleReportSharing = async (reportId: string, shared: boolean) => {
    try {
      const { error } = await supabase
        .from('analytics_saved_reports')
        .update({ shared: !shared })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report ${!shared ? 'shared' : 'unshared'} successfully.`,
      });

      fetchSavedReports();
    } catch (error) {
      console.error("Error updating report sharing:", error);
      toast({
        title: "Error",
        description: "Failed to update report sharing. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Custom Reports</h2>
          <p className="text-muted-foreground">
            Create, save, and run custom analytics reports
          </p>
        </div>
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Builder</DialogTitle>
              <DialogDescription>
                Create a custom analytics report by selecting data sources and columns
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Name</label>
                <Input
                  value={reportBuilder.name}
                  onChange={(e) => setReportBuilder(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter report name..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={reportBuilder.description}
                  onChange={(e) => setReportBuilder(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this report shows..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Dataset</label>
                <Select 
                  value={reportBuilder.dataset} 
                  onValueChange={(value) => setReportBuilder(prev => ({ 
                    ...prev, 
                    dataset: value, 
                    selectedColumns: [] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATASETS).map(([key, dataset]) => (
                      <SelectItem key={key} value={key}>
                        {dataset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportBuilder.dataset && (
                <div>
                  <label className="text-sm font-medium">Columns</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {DATASETS[reportBuilder.dataset as keyof typeof DATASETS].columns.map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={column}
                          checked={reportBuilder.selectedColumns.includes(column)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportBuilder(prev => ({
                                ...prev,
                                selectedColumns: [...prev.selectedColumns, column]
                              }));
                            } else {
                              setReportBuilder(prev => ({
                                ...prev,
                                selectedColumns: prev.selectedColumns.filter(col => col !== column)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={column} className="text-sm">
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveReport}>
                  Save Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports ({savedReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{report.name}</h4>
                    {report.shared && <Badge variant="secondary">Shared</Badge>}
                    {report.owner_id === user?.id && <Badge variant="outline">Owned</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>Dataset: {DATASETS[report.dataset as keyof typeof DATASETS]?.name}</span>
                    <span>Columns: {report.columns.length}</span>
                    <span>Created: {format(new Date(report.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runReport(report)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Run
                  </Button>
                  
                  {report.owner_id === user?.id && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleReportSharing(report.id, report.shared)}
                        className="gap-2"
                      >
                        <Share className="h-4 w-4" />
                        {report.shared ? 'Unshare' : 'Share'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteReport(report.id)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {savedReports.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No saved reports yet. Create your first custom report!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {currentReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{currentReport.name} Results</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {reportData.length} rows • {currentReport.columns.length} columns
                </p>
              </div>
              <Button onClick={exportReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Running report...</div>
            ) : reportData.length > 0 ? (
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentReport.columns.map((column) => (
                        <TableHead key={column}>
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 50).map((row, index) => (
                      <TableRow key={index}>
                        {currentReport.columns.map((column) => (
                          <TableCell key={column}>
                            {row[column] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reportData.length > 50 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Showing first 50 rows of {reportData.length} total rows. Export CSV to see all data.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data found for this report.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}