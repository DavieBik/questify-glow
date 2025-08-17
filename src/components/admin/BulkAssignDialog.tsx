import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CalendarIcon, 
  Search, 
  Users, 
  BookOpen, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  is_mandatory: boolean;
  estimated_duration_minutes: number;
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkAssignDialog({ open, onOpenChange, onSuccess }: BulkAssignDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date>();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchCourses();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, department')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, is_mandatory, estimated_duration_minutes')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0 || selectedCourses.length === 0) {
      toast.error('Please select at least one user and one course');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create enrollments for each user-course combination
      const enrollments = [];
      for (const userId of selectedUsers) {
        for (const courseId of selectedCourses) {
          enrollments.push({
            user_id: userId,
            course_id: courseId,
            status: 'enrolled',
            enrollment_date: new Date().toISOString(),
            due_at: dueDate?.toISOString() || null
          });
        }
      }

      const { error } = await supabase
        .from('user_course_enrollments')
        .upsert(enrollments, { 
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Log the bulk assignment action
      await supabase
        .from('security_audit_log')
        .insert({
          action: 'BULK_ASSIGNMENT',
          resource: 'user_course_enrollments',
          details: {
            user_count: selectedUsers.length,
            course_count: selectedCourses.length,
            total_enrollments: enrollments.length,
            due_date: dueDate?.toISOString() || null,
            courses: selectedCourses,
            users: selectedUsers
          }
        });

      toast.success(`Successfully created ${enrollments.length} enrollments`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating bulk assignments:', error);
      toast.error('Failed to create assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedUsers([]);
    setSelectedCourses([]);
    setDueDate(undefined);
    setUserSearch('');
    setCourseSearch('');
    onOpenChange(false);
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleCourseToggle = (courseId: string, checked: boolean) => {
    if (checked) {
      setSelectedCourses(prev => [...prev, courseId]);
    } else {
      setSelectedCourses(prev => prev.filter(id => id !== courseId));
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.last_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.department?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    course.description?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'Duration not specified';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Course Assignment</DialogTitle>
          <DialogDescription>
            Assign courses to multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Step 1: Select Users
                </CardTitle>
                <CardDescription>
                  Choose the users you want to assign courses to
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or department..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected Users ({selectedUsers.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(userId => {
                        const user = users.find(u => u.id === userId);
                        return user ? (
                          <Badge key={userId} variant="secondary">
                            {user.first_name} {user.last_name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-60 overflow-auto space-y-2 border rounded-lg p-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading users...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                      >
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email} • {user.role} • {user.department || 'No department'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Step 2: Select Courses
                </CardTitle>
                <CardDescription>
                  Choose the courses to assign to selected users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses by title or description..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {selectedCourses.length > 0 && (
                  <div className="bg-secondary border border-border rounded-lg p-3">
                    <p className="text-sm font-medium text-secondary-foreground mb-2">
                      Selected Courses ({selectedCourses.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCourses.map(courseId => {
                        const course = courses.find(c => c.id === courseId);
                        return course ? (
                          <Badge key={courseId} variant="secondary">
                            {course.title}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-60 overflow-auto space-y-2 border rounded-lg p-2">
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No courses found
                    </div>
                  ) : (
                    filteredCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg border"
                      >
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={selectedCourses.includes(course.id)}
                          onCheckedChange={(checked) => handleCourseToggle(course.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-sm">{course.title}</div>
                            {course.is_mandatory && (
                              <Badge variant="outline" className="text-xs border-orange-200 text-orange-800">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                          {course.description && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {course.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(course.estimated_duration_minutes)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Step 3: Set Due Date (Optional)
                </CardTitle>
                <CardDescription>
                  Set a due date for all assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select due date (optional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Assignment Summary</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4" />
                        Selected Users ({selectedUsers.length})
                      </div>
                      <div className="text-xs text-muted-foreground max-h-20 overflow-auto">
                        {selectedUsers.map(userId => {
                          const user = users.find(u => u.id === userId);
                          return user ? `${user.first_name} ${user.last_name}` : '';
                        }).join(', ')}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <BookOpen className="h-4 w-4" />
                        Selected Courses ({selectedCourses.length})
                      </div>
                      <div className="text-xs text-muted-foreground max-h-20 overflow-auto">
                        {selectedCourses.map(courseId => {
                          const course = courses.find(c => c.id === courseId);
                          return course?.title || '';
                        }).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                      <CheckCircle className="h-4 w-4" />
                      Total Assignments to Create
                    </div>
                    <div className="text-lg font-bold text-blue-900">
                      {selectedUsers.length * selectedCourses.length}
                    </div>
                    <div className="text-xs text-blue-700">
                      {selectedUsers.length} users × {selectedCourses.length} courses
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
          
          <div className="flex gap-2">
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && selectedUsers.length === 0) ||
                  (step === 2 && selectedCourses.length === 0)
                }
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || selectedUsers.length === 0 || selectedCourses.length === 0}
              >
                {isSubmitting ? 'Creating Assignments...' : 'Create Assignments'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}