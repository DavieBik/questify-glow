import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Plus, Play, Share, Trash2 } from "lucide-react";
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
  filters: any;
  selectedColumns: string[];
}

const DATASETS = {
  team_performance: {
    name: "Team Performance",
    columns: ["user_name", "manager_name", "progress_pct", "hours_learned", "last_activity"]
  },
  course_metrics: {
    name: "Course Metrics", 
    columns: ["course_title", "learners", "completion_rate", "avg_score", "avg_time"]
  },
  module_performance: {
    name: "Module Performance",
    columns: ["module_title", "course_title", "attempts", "pass_rate", "dropoff_rate"]
  },
  skills_gap_analysis: {
    name: "Skills Gap Analysis",
    columns: ["user_name", "course_title", "status", "due_date", "mandatory"]
  }
};

export function AnalyticsCustomReports() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportBuilder, setReportBuilder] = useState<ReportBuilder>({
    name: "",
    description: "",
    dataset: "",
    filters: {},
    selectedColumns: []
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningReport, setRunningReport] = useState<SavedReport | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedReports();
  }, []);

  const fetchSavedReports = async () => {
    try {
      // Temporary placeholder until analytics_saved_reports table is available
      setSavedReports([]);
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
      // Temporary placeholder until analytics_saved_reports table is available
      console.log('Report would be saved:', reportBuilder);

      toast({
        title: "Success",
        description: "Report saved successfully.",
      });

      setShowBuilder(false);
      setReportBuilder({
        name: "",
        description: "",
        dataset: "",
        filters: {},
        selectedColumns: []
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

  const runReport = async (report: SavedReport | ReportBuilder) => {
    setLoading(true);
    setRunningReport(report as SavedReport);
    
    try {
      const dataset = report.dataset;
      
      switch (dataset) {
        case 'team_performance':
          const { data: teamData, error: teamError } = await (supabase as any).rpc('rpc_admin_team_user_progress');
          if (teamError) throw teamError;
          setReportData(teamData || []);
          break;

        case 'course_metrics':
          const { data: courseData, error: courseError } = await (supabase as any).rpc('rpc_course_metrics');
          if (courseError) throw courseError;
          setReportData(courseData || []);
          break;

        case 'module_performance':
          const { data: moduleData, error: moduleError } = await (supabase as any).rpc('rpc_module_metrics');
          if (moduleError) throw moduleError;
          setReportData(moduleData || []);
          break;

        case 'skills_gap_analysis':
          const { data: skillsData, error: skillsError } = await (supabase as any).rpc('rpc_skills_gap');
          if (skillsError) throw skillsError;
          setReportData(skillsData || []);
          break;

        default:
          setReportData([]);
      }

      toast({
        title: "Success",
        description: "Report generated successfully.",
      });
    } catch (error) {
      console.error("Error running report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (reportData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }

    const columns = runningReport?.columns || Object.keys(reportData[0] || {});
    const headers = columns;
    
    const csvContent = [
      headers.join(","),
      ...reportData.map(row => 
        columns.map(col => row[col] || '').join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runningReport?.name || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteReport = async (reportId: string) => {
    try {
      // Temporary placeholder until analytics_saved_reports table is available
      console.log('Report would be deleted:', reportId);

      toast({
        title: "Success",
        description: "Report deleted successfully.",
      });

      fetchSavedReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleReportSharing = async (report: SavedReport) => {
    try {
      // Temporary placeholder until analytics_saved_reports table is available
      console.log('Report sharing would be toggled:', report);

      toast({
        title: "Success",
        description: `Report ${!report.shared ? 'shared' : 'unshared'} successfully.`,
      });

      fetchSavedReports();
    } catch (error) {
      console.error("Error updating report sharing:", error);
      toast({
        title: "Error",
        description: "Failed to update sharing settings. Please try again.",
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
            Create and manage custom analytics reports
          </p>
        </div>
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={reportBuilder.name}
                  onChange={(e) => setReportBuilder({...reportBuilder, name: e.target.value})}
                  placeholder="Enter report name..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={reportBuilder.description}
                  onChange={(e) => setReportBuilder({...reportBuilder, description: e.target.value})}
                  placeholder="Describe what this report shows..."
                />
              </div>

              <div>
                <Label>Dataset</Label>
                <Select value={reportBuilder.dataset} onValueChange={(value) => 
                  setReportBuilder({...reportBuilder, dataset: value, selectedColumns: []})
                }>
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
                  <Label>Columns to Include</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {DATASETS[reportBuilder.dataset as keyof typeof DATASETS]?.columns.map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={column}
                          checked={reportBuilder.selectedColumns.includes(column)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportBuilder({
                                ...reportBuilder,
                                selectedColumns: [...reportBuilder.selectedColumns, column]
                              });
                            } else {
                              setReportBuilder({
                                ...reportBuilder,
                                selectedColumns: reportBuilder.selectedColumns.filter(c => c !== column)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={column} className="text-sm">
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={saveReport} disabled={!reportBuilder.name || !reportBuilder.dataset}>
                  Save Report
                </Button>
                <Button variant="outline" onClick={() => runReport(reportBuilder)} disabled={!reportBuilder.dataset}>
                  <Play className="h-4 w-4 mr-2" />
                  Preview
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
          {savedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No saved reports yet. Create your first custom report to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {savedReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                          {DATASETS[report.dataset as keyof typeof DATASETS]?.name || report.dataset}
                        </Badge>
                        {report.shared && <Badge>Shared</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => runReport(report)}>
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleReportSharing(report)}
                      >
                        <Share className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {runningReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Report Results: {runningReport.name}</CardTitle>
              <Button onClick={exportReport} variant="outline" className="gap-2" disabled={reportData.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Generating report...</div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for this report.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(reportData[0] || {}).map((key) => (
                        <TableHead key={key}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 100).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value || '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reportData.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Showing first 100 rows of {reportData.length} total results
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}