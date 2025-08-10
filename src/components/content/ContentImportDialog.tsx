import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Copy, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContentImportDialogProps {
  trigger: React.ReactNode;
  onImportComplete?: () => void;
}

export const ContentImportDialog: React.FC<ContentImportDialogProps> = ({
  trigger,
  onImportComplete
}) => {
  const { organization } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [scormFile, setScormFile] = useState<File | null>(null);

  const vendorCourses = [
    {
      id: '1',
      title: 'Mandatory Reporting Requirements in Disability Services',
      description: 'Essential training on legal obligations for mandatory reporting',
      category: 'Compliance',
      difficulty: 'intermediate',
      duration: 80
    },
    {
      id: '2', 
      title: 'Effective Communication in Care Settings',
      description: 'Fundamental communication skills for healthcare workers',
      category: 'Communication',
      difficulty: 'beginner',
      duration: 60
    },
    {
      id: '3',
      title: 'Infection Prevention & Control',
      description: 'Comprehensive infection control protocols',
      category: 'Health & Safety', 
      difficulty: 'beginner',
      duration: 70
    }
  ];

  const handleFileUpload = async () => {
    if (!uploadFile || !organization) return;

    setLoading(true);
    try {
      // Create content import record
      const { data, error } = await supabase
        .from('content_imports')
        .insert({
          organization_id: organization.id,
          import_type: 'upload',
          status: 'processing',
          metadata: {
            filename: uploadFile.name,
            filesize: uploadFile.size,
            filetype: uploadFile.type
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Upload started for ${uploadFile.name}`);
      setOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleScormUpload = async () => {
    if (!scormFile || !organization) return;

    setLoading(true);
    try {
      // Create content import record
      const { data, error } = await supabase
        .from('content_imports')
        .insert({
          organization_id: organization.id,
          import_type: 'scorm',
          status: 'processing',
          metadata: {
            filename: scormFile.name,
            filesize: scormFile.size,
            package_type: 'SCORM'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`SCORM package upload started for ${scormFile.name}`);
      setOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Error uploading SCORM package:', error);
      toast.error('Failed to upload SCORM package');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneCourse = async (courseId: string, courseTitle: string) => {
    if (!organization) return;

    setLoading(true);
    try {
      // Create content import record for cloning
      const { data, error } = await supabase
        .from('content_imports')
        .insert({
          organization_id: organization.id,
          import_type: 'clone',
          source_course_id: courseId,
          status: 'processing',
          metadata: {
            source_title: courseTitle,
            clone_type: 'vendor_catalog'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Started cloning "${courseTitle}" to your organization`);
      setOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Error cloning course:', error);
      toast.error('Failed to clone course');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Content</DialogTitle>
          <DialogDescription>
            Add new courses to your organization through upload, SCORM packages, or vendor catalog
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="scorm" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              SCORM
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Catalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Custom Content</CardTitle>
                <CardDescription>
                  Upload your own training materials and course content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content-file">Course File</Label>
                  <Input
                    id="content-file"
                    type="file"
                    accept=".pdf,.mp4,.pptx,.docx,.zip"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, MP4, PowerPoint, Word, ZIP archives
                  </p>
                </div>

                <Button 
                  onClick={handleFileUpload}
                  disabled={!uploadFile || loading}
                  className="w-full"
                >
                  {loading ? 'Uploading...' : 'Upload Content'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scorm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import SCORM Package</CardTitle>
                <CardDescription>
                  Upload SCORM 1.2 or SCORM 2004 compliant packages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scorm-file">SCORM Package</Label>
                  <Input
                    id="scorm-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setScormFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a ZIP file containing your SCORM package
                  </p>
                </div>

                <Button 
                  onClick={handleScormUpload}
                  disabled={!scormFile || loading}
                  className="w-full"
                >
                  {loading ? 'Processing...' : 'Import SCORM Package'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Catalog</CardTitle>
                <CardDescription>
                  Clone courses from our verified vendor catalog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendorCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{course.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{course.category}</Badge>
                          <Badge className={getDifficultyColor(course.difficulty)}>
                            {course.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {course.duration} minutes
                          </span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleCloneCourse(course.id, course.title)}
                        disabled={loading}
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Clone
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};