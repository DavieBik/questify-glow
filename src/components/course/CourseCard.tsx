import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Star, BookOpen, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string;
    difficulty: string;
    category?: string;
    estimated_duration_minutes?: number;
    thumbnail_url?: string;
    is_mandatory?: boolean;
  };
  enrollment?: {
    progress_percentage: number;
    status: string;
  };
  showProgress?: boolean;
}

export function CourseCard({ course, enrollment, showProgress = false }: CourseCardProps) {
  const difficultyBadgeStyles: Record<string, string> = {
    beginner: 'bg-emerald-100/80 text-emerald-700 border-emerald-200 shadow-[0_1px_0_rgba(16,185,129,0.25)]',
    intermediate: 'bg-sky-100 text-sky-700 border-sky-200 shadow-[0_1px_0_rgba(14,116,144,0.25)]',
    advanced: 'bg-rose-100 text-rose-700 border-rose-200 shadow-[0_1px_0_rgba(225,29,72,0.25)]',
    default: 'bg-slate-100 text-slate-700 border-slate-200 shadow-[0_1px_0_rgba(148,163,184,0.25)]',
  };

  const badgeText = (value?: string) => value?.toUpperCase() ?? '';

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Duration not set';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-[0_1px_0_rgba(16,185,129,0.25)]">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 shadow-[0_1px_0_rgba(59,130,246,0.25)]">In Progress</Badge>;
      case 'enrolled':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300 shadow-[0_1px_0_rgba(245,158,11,0.25)]">Enrolled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="group border border-slate-200/70 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'tracking-[0.08em]',
                  difficultyBadgeStyles[course.difficulty] ?? difficultyBadgeStyles.default
                )}
              >
                {badgeText(course.difficulty)}
              </Badge>
              {course.category && (
                <Badge
                  variant="outline"
                  className="bg-indigo-100 text-indigo-700 border-indigo-200 shadow-[0_1px_0_rgba(129,140,248,0.25)] tracking-[0.05em]"
                >
                  {badgeText(course.category)}
                </Badge>
              )}
              {course.is_mandatory && (
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 shadow-[0_1px_0_rgba(225,29,72,0.2)] tracking-[0.05em]">
                  Mandatory
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
              {course.title}
            </CardTitle>
          </div>
        </div>
        
        {course.description && (
          <CardDescription className="line-clamp-2">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(course.estimated_duration_minutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>Online</span>
          </div>
          {enrollment?.status === 'completed' && (
            <div className="flex items-center gap-1 text-accent-foreground">
              <Award className="h-4 w-4" />
              <span>Certified</span>
            </div>
          )}
        </div>

        {showProgress && enrollment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {enrollment.progress_percentage}%
              </span>
            </div>
            <Progress value={enrollment.progress_percentage} className="h-2" />
            {getStatusBadge(enrollment.status)}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {enrollment && getStatusBadge(enrollment.status)}
          </div>
          <Button
            asChild
            size="sm"
            className={cn(
              'ml-auto rounded-full px-5 py-2 text-sm font-semibold shadow-[0_6px_18px_rgba(16,185,129,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-offset-2',
              enrollment
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-200'
            )}
          >
            <Link to={`/courses/${course.id}`}>
              {enrollment ? 'Continue' : 'Start Course'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
