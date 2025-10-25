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
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  category: string | null;
  difficulty: string;
  level: string | null;
  compliance_standard: string | null;
  training_type: string | null;
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

  const difficultyBadgeStyles: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-[0_1px_0_rgba(16,185,129,0.25)]',
    intermediate: 'bg-sky-100 text-sky-700 border-sky-200 shadow-[0_1px_0_rgba(14,116,144,0.25)]',
    advanced: 'bg-rose-100 text-rose-700 border-rose-200 shadow-[0_1px_0_rgba(225,29,72,0.25)]',
    default: 'bg-slate-100 text-slate-700 border-slate-200 shadow-[0_1px_0_rgba(148,163,184,0.25)]',
  };

  const badgeText = (value?: string | null) =>
    value ? value.toUpperCase() : '';

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
          <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Category Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-600 uppercase tracking-[0.12em]">Categories</Label>
                {categories.length > 0 ? (
                  <div className="space-y-2.5">
                    {categories.map(category => {
                      const isSelected = selectedCategories.includes(category);
                      return (
                        <button
                          type="button"
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={cn(
                            'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all',
                            'flex items-center justify-between gap-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]',
                            isSelected
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.15)]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          )}
                        >
                          <span className="truncate">{category}</span>
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full transition',
                              isSelected ? 'bg-emerald-500' : 'bg-slate-300'
                            )}
                          />
                        </button>
                      );
                    })}
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
                  className="w-full rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
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
                  <Card
                    key={course.id}
                    className="group flex flex-col overflow-hidden border border-slate-200/80 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-44 overflow-hidden">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-200/50 via-brand-sky/20 to-white">
                          <BookOpen className="h-16 w-16 text-emerald-600/50" />
                        </div>
                      )}
                      
                      {/* Mandatory Badge */}
                      {course.is_mandatory && (
                        <Badge className="absolute top-3 right-3 bg-rose-500 text-white shadow-[0_4px_12px_rgba(225,29,72,0.2)]">
                          <Award className="mr-1 h-3 w-3" />
                          Required
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <CardHeader className="flex-grow space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-900 group-hover:text-primary">
                          {course.title}
                        </CardTitle>
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {course.category && (
                          <Badge
                            variant="outline"
                            className="bg-indigo-100 text-indigo-700 border-indigo-200 shadow-[0_1px_0_rgba(129,140,248,0.25)] tracking-[0.06em]"
                          >
                            {badgeText(course.category)}
                          </Badge>
                        )}
                        {course.level && (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-700 border-slate-200 shadow-[0_1px_0_rgba(148,163,184,0.25)] tracking-[0.08em]"
                          >
                            LEVEL: {badgeText(course.level)}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'tracking-[0.08em]',
                            difficultyBadgeStyles[course.difficulty.toLowerCase()] ?? difficultyBadgeStyles.default
                          )}
                        >
                          {badgeText(course.difficulty)}
                        </Badge>
                      </div>

                      <CardDescription className="line-clamp-3 text-sm text-slate-600">
                        {truncateDescription(course.short_description)}
                      </CardDescription>

                      {/* Additional Info */}
                      {(course.compliance_standard || course.training_type) && (
                        <div className="mt-4 space-y-1 border-t pt-3 text-xs text-slate-500">
                          {course.compliance_standard && (
                            <div className="flex items-center gap-2">
                              <Award className="h-3 w-3" />
                              <span>{course.compliance_standard}</span>
                            </div>
                          )}
                          {course.training_type && (
                            <div>
                              <span className="font-semibold text-slate-600">Type:</span> {course.training_type}
                            </div>
                          )}
                        </div>
                      )}
                    </CardHeader>

                    {/* Footer */}
                    <CardFooter className="flex flex-col gap-3 border-t bg-slate-50/60 pt-4">
                      {/* Duration */}
                      {course.estimated_duration_minutes && (
                        <div className="flex w-full items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <span>{formatDuration(course.estimated_duration_minutes)}</span>
                        </div>
                      )}
                      
                      {/* View Course Button */}
                      <Button
                        asChild
                        className="w-full rounded-full bg-emerald-500 text-white shadow-[0_6px_18px_rgba(16,185,129,0.3)] transition hover:bg-emerald-600 focus-visible:ring-emerald-200"
                      >
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
