import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  order_index: z.number().min(1, 'Order must be at least 1'),
  content_type: z.enum(['quiz', 'video', 'document', 'scorm']),
  content_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  pass_threshold_percentage: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  max_attempts: z.number().min(1, 'Must allow at least 1 attempt'),
  time_limit_minutes: z.number().min(1, 'Time limit must be at least 1 minute').optional(),
  is_required: z.boolean().default(true),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  content_type: string;
  content_url: string;
  pass_threshold_percentage: number;
  max_attempts: number;
  time_limit_minutes: number;
  is_required: boolean;
}

const AdminModuleEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<Module | null>(null);

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      order_index: 1,
      content_type: 'video',
      content_url: '',
      pass_threshold_percentage: 80,
      max_attempts: 3,
      time_limit_minutes: 30,
      is_required: true,
    },
  });

  useEffect(() => {
    if (id) {
      fetchModule();
    }
  }, [id]);

  const fetchModule = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setModule(data);
        form.reset({
          title: data.title,
          description: data.description || '',
          order_index: data.order_index,
          content_type: data.content_type as 'quiz' | 'video' | 'document' | 'scorm',
          content_url: data.content_url || '',
          pass_threshold_percentage: data.pass_threshold_percentage,
          max_attempts: data.max_attempts,
          time_limit_minutes: data.time_limit_minutes || 30,
          is_required: data.is_required,
        });
      }
    } catch (error) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error",
        description: "Failed to fetch module details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ModuleFormData) => {
    try {
      const moduleData = {
        title: data.title,
        description: data.description || null,
        order_index: data.order_index,
        content_type: data.content_type,
        content_url: data.content_url || null,
        pass_threshold_percentage: data.pass_threshold_percentage,
        max_attempts: data.max_attempts,
        time_limit_minutes: data.time_limit_minutes || null,
        is_required: data.is_required,
      };

      const { error } = await supabase
        .from('modules')
        .update(moduleData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module updated successfully",
      });

      navigate(`/admin/courses/${module?.course_id}/edit`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast({
        title: "Error",
        description: "Failed to update module",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Module not found</p>
        <Button onClick={() => navigate('/admin/courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${module.course_id}/edit`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Module</h1>
          <p className="text-muted-foreground">
            Update the module details and settings.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Information</CardTitle>
          <CardDescription>
            Update the module details and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter module title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order_index"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Index *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        The order this module appears in the course
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Module description and learning objectives"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description of what this module covers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="content_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                          <SelectItem value="scorm">SCORM Package</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content URL</FormLabel>
                      <FormControl>
                        <Input 
                          type="url" 
                          placeholder="https://example.com/content"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link to the module content (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="pass_threshold_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pass Threshold % *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="80"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 80)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum score to pass (0-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Attempts *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="3"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of attempts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_limit_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="30"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Time limit for completion (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Required Module</FormLabel>
                      <FormDescription>
                        Users must complete this module to finish the course
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/admin/courses/${module.course_id}/edit`)}
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

export default AdminModuleEdit;