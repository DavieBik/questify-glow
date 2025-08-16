import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit, Users, BookOpen, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { AssignCurriculumDialog } from '@/components/curriculum/AssignCurriculumDialog';
import { CurriculumCardSkeleton } from '@/components/ui/loading-skeleton';
import { CurriculaEmptyState, ErrorEmptyState } from '@/components/ui/empty-state';
import { RoleGuard, ManagerOrAdmin } from '@/components/auth/RoleGuard';
import { withErrorHandling } from '@/utils/error-handling';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  item_count?: number;
  assignment_count?: number;
}

const AdminCurricula = () => {
  const { canEdit } = useAuth();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    fetchCurricula();
  }, []);

  const fetchCurricula = async () => {
    setError(null);
    const result = await withErrorHandling(async () => {
      const { data: curriculaData, error } = await supabase
        .from('curricula')
        .select(`
          *,
          curriculum_items(count),
          curriculum_assignments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCurricula = curriculaData?.map(curriculum => ({
        ...curriculum,
        item_count: curriculum.curriculum_items?.[0]?.count || 0,
        assignment_count: curriculum.curriculum_assignments?.[0]?.count || 0,
      })) || [];

      setCurricula(formattedCurricula);
      return formattedCurricula;
    });

    if (!result) {
      setError('Failed to load curricula');
    }
    setLoading(false);
  };

  const toggleCurriculumStatus = async (curriculumId: string, isActive: boolean) => {
    await withErrorHandling(async () => {
      const { error } = await supabase
        .from('curricula')
        .update({ is_active: !isActive })
        .eq('id', curriculumId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Curriculum ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchCurricula();
    });
  };

  const filteredCurricula = curricula.filter(curriculum =>
    curriculum.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    curriculum.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignCurriculum = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
    setShowAssignDialog(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Curricula Management</h1>
            <p className="text-muted-foreground">
              Create and manage learning curricula for your organization
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CurriculumCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Curricula Management</h1>
            <p className="text-muted-foreground">
              Create and manage learning curricula for your organization
            </p>
          </div>
        </div>
        <ErrorEmptyState 
          title="Failed to load curricula"
          description="We encountered an error while loading your curricula. Please try again."
          onRetry={fetchCurricula}
        />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Curricula Management</h1>
          <p className="text-muted-foreground">
            Create and manage learning curricula for your organization
          </p>
        </div>
        <ManagerOrAdmin>
          <Button asChild>
            <Link to="/admin/curricula/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Curriculum
            </Link>
          </Button>
        </ManagerOrAdmin>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search curricula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Curricula Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCurricula.map((curriculum) => (
          <Card key={curriculum.id} className="group hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={curriculum.is_active ? "default" : "secondary"}>
                      {curriculum.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {curriculum.name}
                  </CardTitle>
                  {curriculum.description && (
                    <CardDescription className="line-clamp-2">
                      {curriculum.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{curriculum.item_count} courses</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{curriculum.assignment_count} assigned</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(curriculum.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <ManagerOrAdmin>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCurriculumStatus(curriculum.id, curriculum.is_active)}
                    >
                      {curriculum.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignCurriculum(curriculum)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </ManagerOrAdmin>
                </div>
                <div className="flex gap-2">
                  <ManagerOrAdmin>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/curricula/${curriculum.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                  </ManagerOrAdmin>
                  <Button asChild size="sm">
                    <Link to={`/admin/curricula/${curriculum.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {filteredCurricula.length === 0 && curricula.length === 0 && (
          <CurriculaEmptyState 
            canCreate={canEdit}
            onCreateCurriculum={() => window.location.href = '/admin/curricula/new'}
          />
        )}

        {filteredCurricula.length === 0 && curricula.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No curricula found matching your criteria.</p>
            <ManagerOrAdmin>
              <Button asChild>
                <Link to="/admin/curricula/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Curriculum
                </Link>
              </Button>
            </ManagerOrAdmin>
          </div>
        )}

        {/* Assign Curriculum Dialog */}
        {selectedCurriculum && (
          <AssignCurriculumDialog
            curriculum={selectedCurriculum}
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            onSuccess={fetchCurricula}
          />
        )}
      </div>
    </RoleGuard>
  );
};

export default AdminCurricula;