import React from 'react';
import { LucideIcon, Plus, BookOpen, Users, FileText, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileText,
  title,
  description,
  action,
  className
}) => (
  <Card className={className}>
    <CardContent className="text-center py-12">
      <div className="flex justify-center mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Button 
          onClick={action.onClick}
          variant={action.variant || 'default'}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);

export const CoursesEmptyState: React.FC<{ onCreateCourse?: () => void; canCreate?: boolean }> = ({ 
  onCreateCourse, 
  canCreate = false 
}) => (
  <EmptyState
    icon={BookOpen}
    title="No courses available"
    description="Start building your learning library by creating your first course."
    action={canCreate && onCreateCourse ? {
      label: "Create Course",
      onClick: onCreateCourse
    } : undefined}
  />
);

export const CurriculaEmptyState: React.FC<{ onCreateCurriculum?: () => void; canCreate?: boolean }> = ({ 
  onCreateCurriculum, 
  canCreate = false 
}) => (
  <EmptyState
    icon={FileText}
    title="No curricula found"
    description="Create structured learning paths by building your first curriculum."
    action={canCreate && onCreateCurriculum ? {
      label: "Create Curriculum",
      onClick: onCreateCurriculum
    } : undefined}
  />
);

export const UsersEmptyState: React.FC = () => (
  <EmptyState
    icon={Users}
    title="No users found"
    description="No users match your current search and filter criteria."
  />
);

export const ErrorEmptyState: React.FC<{ title?: string; description?: string; onRetry?: () => void }> = ({ 
  title = "Something went wrong",
  description = "We encountered an error while loading your data. Please try again.",
  onRetry
}) => (
  <EmptyState
    icon={AlertCircle}
    title={title}
    description={description}
    action={onRetry ? {
      label: "Try Again",
      onClick: onRetry,
      variant: 'outline'
    } : undefined}
  />
);