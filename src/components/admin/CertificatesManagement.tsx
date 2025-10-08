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
import { Award, RefreshCw, Search, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
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
            <CardTitle>All Certificates</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {cert.users.first_name} {cert.users.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cert.users.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cert.courses.title}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {cert.certificate_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cert.final_score_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cert.is_valid ? "default" : "destructive"}>
                          {cert.is_valid ? 'Valid' : 'Expired'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(cert)}
                            disabled={!cert.pdf_storage_path}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReissue(cert)}
                            disabled={reissuingId === cert.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${reissuingId === cert.id ? 'animate-spin' : ''}`} />
                          </Button>
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
  );
}