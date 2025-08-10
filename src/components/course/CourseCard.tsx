import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Star, BookOpen, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'intermediate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'advanced': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'enrolled':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Enrolled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                {course.difficulty}
              </Badge>
              {course.category && (
                <Badge variant="secondary" className="text-xs">
                  {course.category}
                </Badge>
              )}
              {course.is_mandatory && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
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
            <div className="flex items-center gap-1 text-emerald-600">
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
          <Button asChild size="sm" className="ml-auto">
            <Link to={`/courses/${course.id}`}>
              {enrollment ? 'Continue' : 'Start Course'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}