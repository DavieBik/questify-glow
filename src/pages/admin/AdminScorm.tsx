import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Eye, BarChart3, Trash2, Upload } from 'lucide-react';

interface ScormPackage {
  id: string;
  title: string;
  version: string;
  created_at: string;
  created_by: string;
  storage_path: string;
  entry_path?: string;
  session_count?: number;
  completion_rate?: number;
}

const AdminScorm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packages, setPackages] = useState<ScormPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);

      // Load SCORM packages with session statistics
      const { data: packagesData, error } = await supabase
        .from('scorm_packages')
        .select(`
          *,
          scorm_sessions (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics for each package
      const packagesWithStats = packagesData.map(pkg => {
        const sessions = pkg.scorm_sessions || [];
        const completedSessions = sessions.filter(s => s.status === 'completed');
        
        return {
          ...pkg,
          session_count: sessions.length,
          completion_rate: sessions.length > 0 
            ? Math.round((completedSessions.length / sessions.length) * 100)
            : 0
        };
      });

      setPackages(packagesWithStats);

    } catch (error) {
      console.error('Error loading SCORM packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SCORM packages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePackage = async (packageId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('scorm')
        .remove([storagePath]);

      if (storageError) {
        console.warn('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database (cascade will handle sessions and interactions)
      const { error: dbError } = await supabase
        .from('scorm_packages')
        .delete()
        .eq('id', packageId);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'SCORM package deleted successfully'
      });

      // Reload packages
      loadPackages();

    } catch (error) {
      console.error('Error deleting SCORM package:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete SCORM package',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getVersionBadge = (version: string) => {
    return (
      <Badge variant="secondary">
        SCORM {version}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SCORM Packages</h1>
          <p className="text-muted-foreground">
            Manage SCORM learning packages and view progress reports
          </p>
        </div>
        <Button onClick={() => navigate('/admin/scorm/upload')}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Package
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SCORM Package Library</CardTitle>
          <CardDescription>
            Upload, manage, and track SCORM learning packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No SCORM Packages</h3>
              <p className="text-muted-foreground mb-4">
                Get started by uploading your first SCORM package
              </p>
              <Button onClick={() => navigate('/admin/scorm/upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Package
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Launch File</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.title}</TableCell>
                      <TableCell>{getVersionBadge(pkg.version)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {pkg.entry_path || 'Not detected'}
                          </code>
                          {!pkg.entry_path && (
                            <span className="text-xs text-muted-foreground">(manual setup required)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{pkg.session_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${pkg.completion_rate || 0}%` }}
                            />
                          </div>
                          <span className="text-sm">{pkg.completion_rate || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(pkg.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/scorm/${pkg.id}/play`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Launch Package
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate(`/admin/scorm/${pkg.id}/report`)}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Report
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Package
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete SCORM Package</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{pkg.title}"? This will permanently 
                                    remove the package and all associated learning sessions and data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deletePackage(pkg.id, pkg.storage_path)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Package
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminScorm;