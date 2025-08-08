import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";

interface TeamProgress {
  user_id: string;
  user_name: string;
  manager_name: string;
  courses_enrolled: number;
  progress_pct: number;
  hours_learned: number;
  attempts: number;
  pass_rate: number;
  last_activity_at: string;
}

export function AnalyticsTeam() {
  const [teamData, setTeamData] = useState<TeamProgress[]>([]);
  const [filteredData, setFilteredData] = useState<TeamProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("90");
  const { isAdmin, isManager } = useAuth();

  useEffect(() => {
    fetchTeamData();
  }, [dateRange]);

  useEffect(() => {
    filterData();
  }, [teamData, searchTerm, statusFilter]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const dateFrom = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const dateTo = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await (supabase as any).rpc('rpc_admin_team_user_progress', {
        date_from: dateFrom,
        date_to: dateTo,
        manager_scope: isManager && !isAdmin
      });

      if (error) throw error;

      // Process data to match our interface
      const processedData = (data || []).map((item: any) => ({
        user_id: item.user_id,
        user_name: item.user_name || 'Unknown User',
        manager_name: item.manager_name || 'No Manager',
        courses_enrolled: item.courses_enrolled || 0,
        progress_pct: Math.round((item.progress_pct || 0) * 100) / 100,
        hours_learned: Math.round((item.time_spent_minutes || 0) / 60 * 10) / 10,
        attempts: item.attempts || 0,
        pass_rate: Math.round((item.best_score || 0) * 100) / 100,
        last_activity_at: item.last_activity_at || new Date().toISOString()
      }));

      setTeamData(processedData);
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = teamData;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manager_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(item => {
        switch (statusFilter) {
          case "in_progress":
            return item.progress_pct > 0 && item.progress_pct < 100;
          case "completed":
            return item.progress_pct >= 100;
          case "not_started":
            return item.progress_pct === 0;
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
  };

  const exportToCsv = () => {
    const headers = [
      "User", "Manager", "Courses Enrolled", "Progress %", 
      "Hours Learned", "Attempts", "Pass Rate %", "Last Activity"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map(row => [
        row.user_name,
        row.manager_name,
        row.courses_enrolled,
        row.progress_pct,
        row.hours_learned,
        row.attempts,
        row.pass_rate,
        format(new Date(row.last_activity_at), 'yyyy-MM-dd')
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getProgressBadge = (progress: number) => {
    if (progress === 0) return <Badge variant="secondary">Not Started</Badge>;
    if (progress < 100) return <Badge variant="outline">In Progress</Badge>;
    return <Badge>Completed</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Team Analytics</h2>
        <Button onClick={exportToCsv} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users or managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchTeamData}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance ({filteredData.length} users)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading team data...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Pass Rate</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell>{user.manager_name}</TableCell>
                      <TableCell>{user.courses_enrolled}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getProgressBadge(user.progress_pct)}
                          <span className="text-sm text-muted-foreground">
                            {user.progress_pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.hours_learned}h</TableCell>
                      <TableCell>{user.attempts}</TableCell>
                      <TableCell>{user.pass_rate}%</TableCell>
                      <TableCell>
                        {format(new Date(user.last_activity_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No team data found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}