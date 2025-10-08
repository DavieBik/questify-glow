import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  final_score_percentage: number;
  is_valid: boolean;
  pdf_storage_path: string | null;
  courses: {
    title: string;
    category: string | null;
  };
}

export function MyCertificatesTab() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

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
          courses (
            title,
            category
          )
        `)
        .eq('user_id', user?.id)
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

  const handleDownload = async (cert: Certificate) => {
    if (!cert.pdf_storage_path) {
      toast.error('Certificate file not found');
      return;
    }

    try {
      // Phase 1: Use signed URL helper (currently returns public URL)
      // Phase 2: Will automatically use signed URL when bucket is private
      const { downloadCertificate } = await import('@/lib/certificates/signedUrls');
      await downloadCertificate(cert.pdf_storage_path, cert.certificate_number);
      toast.success('Certificate downloaded');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const handleView = async (cert: Certificate) => {
    if (!cert.pdf_storage_path) {
      toast.error('Certificate file not found');
      return;
    }

    try {
      // Phase 1: Use signed URL helper (currently returns public URL)
      // Phase 2: Will automatically use signed URL when bucket is private
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
          <p className="text-muted-foreground text-center">
            Complete courses to earn certificates that validate your achievements.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {certificates.map((cert) => (
          <Card key={cert.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{cert.courses.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cert.courses.category && (
                      <Badge variant="secondary" className="text-xs">
                        {cert.courses.category}
                      </Badge>
                    )}
                    <Badge 
                      variant={cert.is_valid ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {cert.is_valid ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Valid</>
                      ) : (
                        'Expired'
                      )}
                    </Badge>
                  </div>
                  <CardDescription>
                    Certificate #{cert.certificate_number}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Issued</p>
                    <p className="font-medium">
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {cert.expiry_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {new Date(cert.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-medium">{cert.final_score_percentage}%</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleView(cert)}
                  disabled={!cert.pdf_storage_path}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDownload(cert)}
                  disabled={!cert.pdf_storage_path}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}