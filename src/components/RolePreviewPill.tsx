import { usePreviewRole } from '@/lib/rolePreview';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export function RolePreviewPill() {
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true';
  
  if (!isPreviewEnabled) {
    return null;
  }
  
  try {
    const { previewRole, clearPreview } = usePreviewRole();
    
    if (!previewRole) {
      return null;
    }
    
    return (
      <Badge 
        variant="secondary" 
        className="cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1"
        onClick={clearPreview}
        title="Click to reset to real role"
      >
        Preview: {previewRole.charAt(0).toUpperCase() + previewRole.slice(1)}
        <X className="h-3 w-3" />
      </Badge>
    );
  } catch {
    // Preview context not available
    return null;
  }
}