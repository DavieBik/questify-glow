import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, User } from 'lucide-react';

interface Curriculum {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
}

interface Department {
  id: string;
  name: string;
}

interface AssignCurriculumDialogProps {
  curriculum: Curriculum;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignCurriculumDialog({ 
  curriculum, 
  open, 
  onOpenChange, 
  onSuccess 
}: AssignCurriculumDialogProps) {
  const [assignmentType, setAssignmentType] = useState<'users' | 'departments'>('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchUsersAndDepartments();
    }
  }, [open]);

  const fetchUsersAndDepartments = async () => {
    try {
      setDataLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, department')
        .eq('is_active', true)
        .order('first_name');

      if (usersError) throw usersError;

      // Fetch departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (departmentsError) throw departmentsError;

      setUsers(usersData || []);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load users and departments",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDepartments(prev => [...prev, departmentId]);
    } else {
      setSelectedDepartments(prev => prev.filter(id => id !== departmentId));
    }
  };

  const handleAssign = async () => {
    if (assignmentType === 'users' && selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    if (assignmentType === 'departments' && selectedDepartments.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one department",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let targetUsers: string[] = [];

      if (assignmentType === 'users') {
        targetUsers = selectedUsers;
      } else {
        // Get users from selected departments
        const { data: departmentUsers, error } = await supabase
          .from('user_departments')
          .select('user_id')
          .in('department_id', selectedDepartments);

        if (error) throw error;
        targetUsers = departmentUsers?.map(du => du.user_id) || [];
      }

      // Get current user
      const { data: currentUser } = await supabase.auth.getUser();
      const assignedBy = currentUser.user?.id;

      for (const userId of targetUsers) {
        const { error } = await supabase
          .rpc('assign_curriculum_to_user', {
            p_curriculum_id: curriculum.id,
            p_user_id: userId,
            p_assigned_by: assignedBy
          });

        if (error) {
          console.error('Error assigning curriculum to user:', userId, error);
          // Continue with other users even if one fails
        }
      }

      toast({
        title: "Success",
        description: `Curriculum assigned to ${targetUsers.length} user(s) successfully`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedUsers([]);
      setSelectedDepartments([]);
      setAssignmentType('users');
    } catch (error) {
      console.error('Error assigning curriculum:', error);
      toast({
        title: "Error",
        description: "Failed to assign curriculum",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUserName = (user: User) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Curriculum</DialogTitle>
          <DialogDescription>
            Assign "{curriculum.name}" to users or departments. This will automatically enroll them in all courses within the curriculum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Type */}
          <div className="space-y-2">
            <Label>Assignment Type</Label>
            <Select value={assignmentType} onValueChange={(value: 'users' | 'departments') => setAssignmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Individual Users
                  </div>
                </SelectItem>
                <SelectItem value="departments">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Departments
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* User Selection */}
              {assignmentType === 'users' && (
                <div className="space-y-3">
                  <Label>Select Users</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                        />
                        <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>{formatUserName(user)}</span>
                            {user.department && (
                              <span className="text-sm text-muted-foreground">{user.department}</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No users available</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedUsers.length} user(s) selected
                  </p>
                </div>
              )}

              {/* Department Selection */}
              {assignmentType === 'departments' && (
                <div className="space-y-3">
                  <Label>Select Departments</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                    {departments.map((department) => (
                      <div key={department.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${department.id}`}
                          checked={selectedDepartments.includes(department.id)}
                          onCheckedChange={(checked) => handleDepartmentToggle(department.id, checked as boolean)}
                        />
                        <Label htmlFor={`dept-${department.id}`} className="flex-1 cursor-pointer">
                          {department.name}
                        </Label>
                      </div>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No departments available</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedDepartments.length} department(s) selected
                  </p>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={loading || dataLoading}>
              {loading ? "Assigning..." : "Assign Curriculum"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}