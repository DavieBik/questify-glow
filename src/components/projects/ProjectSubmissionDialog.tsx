import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  project?: {
    title: string;
    submission_format?: 'file' | 'link' | 'text';
  };
}

interface ProjectSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSubmissionCreated: () => void;
}

export const ProjectSubmissionDialog: React.FC<ProjectSubmissionDialogProps> = ({
  open,
  onOpenChange,
  team,
  onSubmissionCreated,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    file_url: '',
    link_url: '',
    is_final: false,
  });

  const getSubmissionType = (): 'file' | 'link' | 'text' => {
    if (team?.project?.submission_format) {
      return team.project.submission_format;
    }
    // Default to file if not specified
    return 'file';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    const submissionType = getSubmissionType();
    let hasContent = false;

    // Validate based on submission type
    switch (submissionType) {
      case 'text':
        hasContent = formData.content.trim() !== '';
        break;
      case 'link':
        hasContent = formData.link_url.trim() !== '';
        break;
      case 'file':
        hasContent = formData.file_url.trim() !== '';
        break;
    }

    if (!hasContent) {
      toast({
        title: "Error",
        description: `Please provide ${submissionType === 'text' ? 'content' : submissionType === 'link' ? 'a link' : 'a file URL'}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        team_id: team.id,
        submitted_by: user?.id,
        submission_type: submissionType,
        content: submissionType === 'text' ? formData.content.trim() : null,
        link_url: submissionType === 'link' ? formData.link_url.trim() : null,
        file_url: submissionType === 'file' ? formData.file_url.trim() : null,
        is_final: formData.is_final,
      };

      const { error } = await supabase
        .from('project_submissions')
        .insert(submissionData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${formData.is_final ? 'Final submission' : 'Draft'} submitted successfully`,
      });

      // Reset form
      setFormData({
        content: '',
        file_url: '',
        link_url: '',
        is_final: false,
      });

      onSubmissionCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating submission:', error);
      toast({
        title: "Error",
        description: "Failed to submit work",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submissionType = getSubmissionType();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Project Work</DialogTitle>
          <DialogDescription>
            {team && (
              <>
                Submit work for team <strong>{team.name}</strong>
                <br />
                Project: {team.project?.title}
                <br />
                Submission format: {submissionType}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {submissionType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="content">Project Content *</Label>
              <Textarea
                id="content"
                placeholder="Enter your project content, findings, or report"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                required
              />
            </div>
          )}

          {submissionType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="link_url">Project Link/URL *</Label>
              <Input
                id="link_url"
                type="url"
                placeholder="https://example.com/your-project"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                Provide a link to your project (e.g., GitHub repository, Google Drive, etc.)
              </p>
            </div>
          )}

          {submissionType === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="file_url">File URL *</Label>
              <Input
                id="file_url"
                type="url"
                placeholder="https://example.com/your-file.pdf"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                Upload your file to a file sharing service and paste the public link here
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_final"
              checked={formData.is_final}
              onCheckedChange={(checked) => setFormData({ ...formData, is_final: checked })}
            />
            <Label htmlFor="is_final">Mark as final submission</Label>
            <p className="text-sm text-muted-foreground ml-2">
              (Final submissions cannot be changed)
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : formData.is_final ? 'Submit Final Work' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};