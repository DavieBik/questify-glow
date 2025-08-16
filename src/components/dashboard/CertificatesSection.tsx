import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, ExternalLink, Calendar } from 'lucide-react';
import { withErrorHandling } from '@/utils/error-handling';
import { EmptyState } from '@/components/ui/empty-state';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  final_score_percentage: number;
  pdf_url: string | null;
  verification_url: string | null;
  course_title: string;
  is_valid: boolean;
}

export function CertificatesSection() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    await withErrorHandling(async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          issue_date,
          expiry_date,
          final_score_percentage,
          pdf_url,
          verification_url,
          is_valid,
          courses!inner (
            title
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_valid', true)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const formattedCertificates = data?.map(cert => ({
        id: cert.id,
        certificate_number: cert.certificate_number,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date,
        final_score_percentage: cert.final_score_percentage,
        pdf_url: cert.pdf_url,
        verification_url: cert.verification_url,
        course_title: cert.courses.title,
        is_valid: cert.is_valid,
      })) || [];

      setCertificates(formattedCertificates);
    });
    setLoading(false);
  };

  const handleDownload = async (certificateId: string, courseName: string) => {
    try {
      // This would typically call a Supabase function to generate/serve the PDF
      const { data, error } = await supabase.functions.invoke('generate-certificate-pdf', {
        body: { certificateId }
      });

      if (error) throw error;

      // Create download link
      const link = document.createElement('a');
      link.href = data.pdf_url;
      link.download = `certificate-${courseName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            My Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse p-4 border rounded-lg">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          My Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Complete courses to earn certificates that validate your achievements."
          />
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{cert.course_title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Issued {formatDate(cert.issue_date)}</span>
                      </div>
                      <Badge variant="secondary">
                        Score: {cert.final_score_percentage}%
                      </Badge>
                      {cert.expiry_date && (
                        <Badge 
                          variant={isExpiringSoon(cert.expiry_date) ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          Expires {formatDate(cert.expiry_date)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Certificate #{cert.certificate_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {cert.pdf_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownload(cert.id, cert.course_title)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Download PDF
                    </Button>
                  )}
                  
                  {cert.verification_url && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      asChild
                      className="flex items-center gap-2"
                    >
                      <a href={cert.verification_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        Verify
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}