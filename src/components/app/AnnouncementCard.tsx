import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

interface AnnouncementCardProps {
  title: string;
  onClick: () => void;
}

export function AnnouncementCard({ title, onClick }: AnnouncementCardProps) {
  return (
    <Card 
      className="p-4 bg-muted/50 border-l-4 border-l-accent cursor-pointer hover:bg-muted/80 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Card>
  );
}