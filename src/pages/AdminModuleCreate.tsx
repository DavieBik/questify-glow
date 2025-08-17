import React from 'react';
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
import { ArrowLeft, Upload } from 'lucide-react';
import { getClientVideoProvider, isClientMux } from '@/lib/video/provider';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  order_index: z.number().min(1, 'Order must be at least 1'),
  content_type: z.enum(['quiz', 'video', 'document', 'scorm']),
  content_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  provider: z.enum(['storage', 'youtube', 'vimeo', 'mux', 'cloudflare']).optional(),
  pass_threshold_percentage: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  max_attempts: z.number().min(1, 'Must allow at least 1 attempt'),
  time_limit_minutes: z.number().min(1, 'Time limit must be at least 1 minute').optional(),
  is_required: z.boolean().default(true),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

const AdminModuleCreate: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoProvider = getClientVideoProvider();
  const isMuxProvider = isClientMux();

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      order_index: 1,
      content_type: 'video',
      content_url: '',
      provider: videoProvider as 'storage' | 'youtube' | 'vimeo' | 'mux' | 'cloudflare',
      pass_threshold_percentage: 80,
      max_attempts: 3,
      time_limit_minutes: 30,
      is_required: true,
    },
  });

  const onSubmit = async (data: ModuleFormData) => {
    try {
      const moduleData = {
        course_id: courseId,
        title: data.title,
        description: data.description || null,
        order_index: data.order_index,
        content_type: data.content_type,
        content_url: data.content_url || null,
        provider: data.provider || videoProvider,
        pass_threshold_percentage: data.pass_threshold_percentage,
        max_attempts: data.max_attempts,
        time_limit_minutes: data.time_limit_minutes || null,
        is_required: data.is_required,
      };

      const { error } = await supabase
        .from('modules')
        .insert([moduleData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module created successfully",
      });

      navigate(`/admin/courses/${courseId}/edit`);
    } catch (error) {
      console.error('Error creating module:', error);
      toast({
        title: "Error",
        description: "Failed to create module",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${courseId}/edit`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Module</h1>
          <p className="text-muted-foreground">
            Add a new learning module to this course.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Information</CardTitle>
          <CardDescription>
            Enter the details for your new module
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

                {form.watch('content_type') === 'video' && (
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Provider *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select video provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mux">Mux (Recommended)</SelectItem>
                            <SelectItem value="storage">File Storage</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                            {!isMuxProvider && (
                              <SelectItem value="cloudflare">Cloudflare Stream</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Current system default: {videoProvider.toUpperCase()}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {form.watch('content_type') === 'video' && form.watch('provider') === 'mux' && (
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Mux Video Upload</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    For Mux videos, leave the Content URL empty. After creating the module, 
                    you'll be able to upload video files directly through the Mux interface.
                  </p>
                </div>
              )}

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
                      {form.watch('provider') === 'mux' 
                        ? 'Leave empty for Mux videos - upload after module creation'
                        : 'Link to the module content (optional)'
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Module'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/admin/courses/${courseId}/edit`)}
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

export default AdminModuleCreate;