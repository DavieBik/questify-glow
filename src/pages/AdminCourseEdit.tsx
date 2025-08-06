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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  short_description: z.string().max(500, 'Short description must be less than 500 characters').optional(),
  description: z.string().optional(),
  category: z.string().max(255, 'Category must be less than 255 characters').optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  is_mandatory: z.boolean().default(false),
  ndis_compliant: z.boolean().default(true),
  is_active: z.boolean().default(true),
  video_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface Module {
  id: string;
  title: string;
  order_index: number;
  content_type: string;
  is_required: boolean;
  pass_threshold_percentage: number;
  max_attempts: number;
}

const AdminCourseEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      short_description: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      estimated_duration_minutes: 60,
      is_mandatory: false,
      ndis_compliant: true,
      is_active: true,
      video_url: '',
    },
  });

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchModules();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          title: data.title,
          short_description: data.short_description || '',
          description: data.description || '',
          category: data.category || '',
          difficulty: data.difficulty,
          estimated_duration_minutes: data.estimated_duration_minutes || 60,
          is_mandatory: data.is_mandatory,
          ndis_compliant: data.ndis_compliant,
          is_active: data.is_active,
          video_url: data.video_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: "Error",
        description: "Failed to fetch course details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      if (error) throw error;

      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch course modules",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: CourseFormData) => {
    try {
      const courseData = {
        title: data.title,
        short_description: data.short_description || null,
        description: data.description || null,
        category: data.category || null,
        difficulty: data.difficulty,
        estimated_duration_minutes: data.estimated_duration_minutes || null,
        is_mandatory: data.is_mandatory,
        ndis_compliant: data.ndis_compliant,
        is_active: data.is_active,
        video_url: data.video_url || null,
      };

      const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course updated successfully",
      });

      navigate('/admin/courses');
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course",
        variant: "destructive",
      });
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'quiz': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'video': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'document': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'scorm': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Course</h1>
          <p className="text-muted-foreground">
            Update course details and manage modules.
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                Update the course details and settings
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
                          <FormLabel>Course Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter course title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Safety, Compliance, Skills" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="short_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description for course listings"
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief overview that appears in course listings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed course description, objectives, and what learners will gain"
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed information about the course content and learning objectives
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Level *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="60"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Estimated time to complete the course
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="https://example.com/course-video.mp4"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Direct link to the main course video (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active Course</FormLabel>
                            <FormDescription>
                              Make this course available to users
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_mandatory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Mandatory Course</FormLabel>
                            <FormDescription>
                              Require all users to complete this course
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ndis_compliant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>NDIS Compliant</FormLabel>
                            <FormDescription>
                              This course meets NDIS compliance requirements
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/admin/courses')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Course Modules</CardTitle>
                  <CardDescription>
                    Manage the learning modules for this course
                  </CardDescription>
                </div>
                <Button onClick={() => navigate(`/admin/courses/${id}/modules/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No modules created yet</p>
                  <Button onClick={() => navigate(`/admin/courses/${id}/modules/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Module
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module) => (
                    <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {module.order_index}
                        </div>
                        <div>
                          <h4 className="font-medium">{module.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getContentTypeColor(module.content_type)}>
                              {module.content_type}
                            </Badge>
                            {module.is_required && (
                              <Badge variant="secondary">Required</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {module.pass_threshold_percentage}% pass threshold
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {module.max_attempts} attempts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/modules/${module.id}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCourseEdit;