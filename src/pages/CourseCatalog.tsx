import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, Clock, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  category: string | null;
  difficulty: string;
  estimated_duration_minutes: number | null;
  thumbnail_url: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

export default function CourseCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch all active courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      return data as Course[];
    }
  });

  // Extract unique categories
  const categories = useMemo(() => {
    if (!courses) return [];
    const uniqueCategories = new Set(
      courses
        .map(c => c.category)
        .filter((cat): cat is string => cat !== null && cat !== '')
    );
    return Array.from(uniqueCategories).sort();
  }, [courses]);

  // Filter courses based on search and category selections
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter(course => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.short_description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategories.length === 0 ||
        (course.category && selectedCategories.includes(course.category));
      
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const truncateDescription = (text: string | null) => {
    if (!text) return 'No description available';
    return text.length > 150 ? text.substring(0, 147) + '...' : text;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Browse and enroll in available training courses
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search courses by title or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Layout: Filters + Course Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Filters (Desktop) / Top (Mobile) */}
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Categories</Label>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <label
                          htmlFor={`category-${category}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories available</p>
                )}
              </div>

              {/* Clear Filters */}
              {selectedCategories.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategories([])}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Right Content - Course Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery || selectedCategories.length > 0
                    ? 'Try adjusting your search or filters'
                    : 'No courses are currently available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
                </p>
              </div>

              {/* Course Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    {/* Thumbnail */}
                    <div className="relative h-48 bg-muted overflow-hidden">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Mandatory Badge */}
                      {course.is_mandatory && (
                        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                          <Award className="h-3 w-3 mr-1" />
                          Required
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <CardHeader className="flex-grow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-lg line-clamp-2">
                          {course.title}
                        </CardTitle>
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {course.category && (
                          <Badge variant="secondary" className="text-xs">
                            {course.category}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getDifficultyColor(course.difficulty)}`}
                        >
                          {course.difficulty}
                        </Badge>
                      </div>

                      <CardDescription className="line-clamp-3 text-sm">
                        {truncateDescription(course.short_description)}
                      </CardDescription>
                    </CardHeader>

                    {/* Footer */}
                    <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                      {/* Duration */}
                      {course.estimated_duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(course.estimated_duration_minutes)}</span>
                        </div>
                      )}
                      
                      {/* View Course Button */}
                      <Button asChild className="w-full">
                        <Link to={`/courses/${course.id}`}>
                          View Course
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
