import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Award, RefreshCw, Search, Download, ExternalLink, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  final_score_percentage: number;
  is_valid: boolean;
  pdf_storage_path: string | null;
  user_id: string;
  course_id: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  courses: {
    title: string;
  };
}

export function CertificatesManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reissuingId, setReissuingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          issue_date,
          expiry_date,
          final_score_percentage,
          is_valid,
          pdf_storage_path,
          user_id,
          course_id,
          users!certificates_user_id_fkey (
            first_name,
            last_name,
            email
          ),
          courses (
            title
          )
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleReissue = async (cert: Certificate) => {
    setReissuingId(cert.id);
    try {
      // Re-generate the certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate-pdf', {
        body: {
          certificateNumber: cert.certificate_number,
          userName: `${cert.users.first_name} ${cert.users.last_name}`,
          courseTitle: cert.courses.title,
          completionDate: cert.issue_date,
          trainerSignature: 'Training Administrator',
          userId: cert.user_id,
          courseId: cert.course_id
        }
      });

      if (error) throw error;

      // Update certificate record with new storage path
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ 
          pdf_storage_path: data.storagePath,
          pdf_url: data.pdfUrl
        })
        .eq('id', cert.id);

      if (updateError) throw updateError;

      toast.success('Certificate re-issued successfully');
      fetchCertificates();
    } catch (error) {
      console.error('Error re-issuing certificate:', error);
      toast.error('Failed to re-issue certificate');
    } finally {
      setReissuingId(null);
    }
  };

  const handleView = async (cert: Certificate) => {
    if (!cert.pdf_storage_path) {
      toast.error('Certificate file not found');
      return;
    }

    try {
      const { getCertificateDownloadUrl } = await import('@/lib/certificates/signedUrls');
      const result = await getCertificateDownloadUrl(cert.pdf_storage_path);
      
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        throw new Error(result.error || 'Failed to get certificate URL');
      }
    } catch (error) {
      console.error('Error viewing certificate:', error);
      toast.error('Failed to view certificate');
    }
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.users.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.courses.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreVariant = (score: number) => {
    if (score >= 90) return 'default'; // High score - green
    if (score >= 70) return 'secondary'; // Medium score - blue
    return 'destructive'; // Low score - red
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    if (score >= 70) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Certificates Management</h2>
          <p className="text-muted-foreground">View and re-issue certificates</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>All Certificates</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredCertificates.length} certificate{filteredCertificates.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading certificates...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No certificates found
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Learner</TableHead>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Certificate #</TableHead>
                    <TableHead className="font-semibold">Score</TableHead>
                    <TableHead className="font-semibold">Issue Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => (
                    <TableRow key={cert.id} className="hover:bg-muted/30">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {cert.users.first_name?.[0]}{cert.users.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {cert.users.first_name} {cert.users.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cert.users.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-medium max-w-xs truncate">
                          {cert.courses.title}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {cert.certificate_number}
                        </code>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={getScoreColor(cert.final_score_percentage)}>
                          {cert.final_score_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm">
                          {new Date(cert.issue_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          variant={cert.is_valid ? "default" : "destructive"}
                          className="font-medium"
                        >
                          {cert.is_valid ? 'Valid' : 'Expired'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleView(cert)}
                                disabled={!cert.pdf_storage_path}
                                className="h-9"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View certificate PDF</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReissue(cert)}
                                disabled={reissuingId === cert.id}
                                className="h-9"
                              >
                                <RefreshCw className={`h-4 w-4 mr-1 ${reissuingId === cert.id ? 'animate-spin' : ''}`} />
                                Re-issue
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Re-generate certificate</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}