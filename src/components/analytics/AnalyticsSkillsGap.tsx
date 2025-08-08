import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Mail, CalendarIcon, Filter, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface SkillsGapEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  course_id: string;
  course_title: string;
  mandatory: boolean;
  due_date: Date | null;
  status: 'missing' | 'overdue' | 'ok';
}

export function AnalyticsSkillsGap() {
  const [skillsGap, setSkillsGap] = useState<SkillsGapEntry[]>([]);
  const [filteredData, setFilteredData] = useState<SkillsGapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dueBefore, setDueBefore] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const { isAdmin, isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSkillsGapData();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterData();
  }, [skillsGap, statusFilter, courseFilter, searchTerm, dueBefore]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_mandatory', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchSkillsGapData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_skills_gap', {
        manager_scope: isManager && !isAdmin
      });

      if (error) throw error;

      const processedData = data?.map((item: any) => ({
        user_id: item.user_id,
        user_name: item.user_name || 'Unknown User',
        user_email: item.user_email || '',
        course_id: item.course_id,
        course_title: item.course_title || 'Unknown Course',
        mandatory: item.mandatory,
        due_date: item.due_date ? new Date(item.due_date) : null,
        status: item.status
      })) || [];

      setSkillsGap(processedData);
    } catch (error) {
      console.error("Error fetching skills gap data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = skillsGap;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.course_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (courseFilter !== "all") {
      filtered = filtered.filter(item => item.course_id === courseFilter);
    }

    if (dueBefore) {
      filtered = filtered.filter(item => 
        item.due_date && item.due_date <= dueBefore
      );
    }

    setFilteredData(filtered);
  };

  const toggleSelection = (key: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map(item => `${item.user_id}-${item.course_id}`)));
    }
  };

  const bulkEnroll = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to enroll.",
        variant: "destructive",
      });
      return;
    }

    try {
      const enrollments = Array.from(selectedItems).map(key => {
        const [user_id, course_id] = key.split('-');
        return {
          user_id,
          course_id,
          enrolled_at: new Date().toISOString(),
          status: 'enrolled'
        };
      });

      const { error } = await supabase
        .from('user_course_enrollments')
        .upsert(enrollments, { onConflict: 'user_id,course_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Enrolled ${enrollments.length} users in selected courses.`,
      });

      // Refresh data
      fetchSkillsGapData();
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error enrolling users:", error);
      toast({
        title: "Error",
        description: "Failed to enroll users. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendReminders = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to send reminders for.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reminders = Array.from(selectedItems).map(key => {
        const [user_id, course_id] = key.split('-');
        const item = filteredData.find(item => 
          item.user_id === user_id && item.course_id === course_id
        );
        return {
          user_id,
          course_id,
          user_email: item?.user_email,
          course_title: item?.course_title,
          due_date: item?.due_date
        };
      });

      // Call email function for each reminder
      for (const reminder of reminders) {
        await supabase.functions.invoke('send-reminder-email', {
          body: {
            email: reminder.user_email,
            courseName: reminder.course_title,
            dueDate: reminder.due_date
          }
        });
      }

      toast({
        title: "Success",
        description: `Sent reminders for ${reminders.length} training requirements.`,
      });

      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Error",
        description: "Failed to send some reminders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToCsv = () => {
    const headers = [
      "User", "Email", "Course", "Status", "Due Date", "Mandatory"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map(row => [
        row.user_name,
        row.user_email,
        row.course_title,
        row.status,
        row.due_date ? format(row.due_date, 'yyyy-MM-dd') : '',
        row.mandatory ? 'Yes' : 'No'
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-gap-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'missing':
        return <Badge variant="secondary">Missing</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'ok':
        return <Badge>Complete</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Skills Gap Analysis</h2>
          <p className="text-muted-foreground">
            Track mandatory training compliance and identify skill gaps
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCsv} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search users or courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="ok">Complete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dueBefore && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueBefore ? format(dueBefore, "PPP") : "Due before..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueBefore}
                  onSelect={setDueBefore}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={fetchSkillsGapData}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} items selected
              </span>
              <Button onClick={bulkEnroll} className="gap-2">
                <Users className="h-4 w-4" />
                Enroll Selected
              </Button>
              <Button onClick={sendReminders} variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Send Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Gap Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Training Compliance Matrix ({filteredData.length} gaps)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading skills gap data...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const key = `${item.user_id}-${item.course_id}`;
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(key)}
                            onCheckedChange={() => toggleSelection(key)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.user_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.user_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.course_title}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.due_date ? (
                            <span className={
                              item.status === 'overdue' ? 'text-red-600 font-medium' : 
                              item.due_date <= addDays(new Date(), 7) ? 'text-yellow-600' : ''
                            }>
                              {format(item.due_date, 'MMM dd, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.mandatory ? "default" : "outline"}>
                            {item.mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No skills gaps found for the selected filters."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">
              Training requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredData.filter(item => item.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredData.filter(item => item.status === 'missing').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Not enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {skillsGap.length > 0 ? 
                Math.round((skillsGap.filter(item => item.status === 'ok').length / skillsGap.length) * 100) 
                : 100}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall compliance
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}