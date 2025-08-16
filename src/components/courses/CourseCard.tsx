import { MoreVertical, Play, BookOpen, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CourseCardProps {
  id: string;
  title: string;
  code?: string;
  color?: string;
}

export function CourseCard({ id, title, code, color }: CourseCardProps) {
  const headerColor = color || 'hsl(var(--brand-gold))';
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      {/* Header strip */}
      <div 
        className="h-2"
        style={{ backgroundColor: headerColor }}
      />
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-1">
              {title}
            </h3>
            {code && (
              <p className="text-sm text-muted-foreground">{code}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -mt-1 -mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Continue
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookOpen className="mr-2 h-4 w-4" />
                Syllabus
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Manage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}