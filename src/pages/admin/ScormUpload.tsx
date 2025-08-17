import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, FileArchive } from 'lucide-react';

const scormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  version: z.enum(['1.2', '2004'], { required_error: 'Please select a SCORM version' }),
  file: z.instanceof(File, { message: 'Please select a SCORM package file' })
});

type ScormFormData = z.infer<typeof scormSchema>;

const ScormUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const form = useForm<ScormFormData>({
    resolver: zodResolver(scormSchema),
    defaultValues: {
      title: '',
      version: '2004'
    }
  });

  const onSubmit = async (data: ScormFormData) => {
    if (!user) return;

    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `packages/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('scorm')
        .upload(filePath, data.file);

      if (uploadError) throw uploadError;

      // Create package record
      const { error: packageError } = await supabase
        .from('scorm_packages')
        .insert({
          title: data.title,
          version: data.version,
          storage_path: filePath,
          created_by: user.id
        });

      if (packageError) throw packageError;

      toast({
        title: 'Success',
        description: 'SCORM package uploaded successfully'
      });

      navigate('/admin/scorm');

    } catch (error) {
      console.error('Error uploading SCORM package:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload SCORM package',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('file', file);
      
      // Auto-fill title from filename if empty
      if (!form.getValues('title')) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        form.setValue('title', titleFromFile);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/scorm')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to SCORM Packages
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload SCORM Package</h1>
          <p className="text-muted-foreground">
            Upload a new SCORM 1.2 or SCORM 2004 learning package
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Package Details</CardTitle>
          <CardDescription>
            Upload a SCORM package (.zip file) and provide basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter package title" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive title for this SCORM package
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SCORM Version *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select SCORM version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1.2">SCORM 1.2</SelectItem>
                        <SelectItem value="2004">SCORM 2004</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the SCORM specification version used by this package
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>SCORM Package File *</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-muted rounded-lg p-6">
                        <div className="flex flex-col items-center gap-4">
                          <FileArchive className="h-12 w-12 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium">Upload SCORM Package</p>
                            <p className="text-xs text-muted-foreground">
                              Select a .zip file containing your SCORM package
                            </p>
                          </div>
                          <input
                            type="file"
                            accept=".zip"
                            onChange={handleFileChange}
                            className="hidden"
                            id="scorm-file"
                            {...field}
                          />
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => document.getElementById('scorm-file')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                          {value && (
                            <p className="text-sm text-muted-foreground">
                              Selected: {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a .zip file containing your SCORM package (max 100MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Package
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/admin/scorm')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScormUpload;