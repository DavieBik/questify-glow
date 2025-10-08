import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, Award, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  final_score_percentage: number;
  is_valid: boolean;
  pdf_url: string;
  verification_url: string;
  courses: {
    title: string;
  };
}

const Certificates = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
          *,
          courses (
            title
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

  const downloadCertificate = async (certificate: Certificate) => {
    if (!certificate.pdf_url) {
      toast.error('Certificate PDF not available');
      return;
    }

    try {
      // Phase 1: Use signed URL helper (currently returns public URL)
      // Phase 2: Will automatically use signed URL when bucket is private
      // Note: This uses pdf_url for now, but will switch to storage path in Phase 2
      const link = document.createElement('a');
      link.href = certificate.pdf_url;
      link.download = `certificate-${certificate.certificate_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Certificate download started');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.courses.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Certificates</h1>
        <p className="text-muted-foreground">
          View and download your earned certificates
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search certificates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCertificates.map((certificate) => (
          <Card key={certificate.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Award className="h-8 w-8 text-accent mb-2" />
                <div className="flex flex-col gap-1">
                  <Badge 
                    variant={certificate.is_valid ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {certificate.is_valid ? 'Valid' : 'Invalid'}
                  </Badge>
                  {certificate.expiry_date && isExpired(certificate.expiry_date) && (
                    <Badge variant="destructive" className="text-xs">
                      Expired
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="line-clamp-2">{certificate.courses.title}</CardTitle>
              <CardDescription>
                Certificate #{certificate.certificate_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium">{certificate.final_score_percentage}%</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Issued:</span>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{new Date(certificate.issue_date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {certificate.expiry_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expires:</span>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span className={isExpired(certificate.expiry_date) ? 'text-destructive' : ''}>
                        {new Date(certificate.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to={`/certificates/${certificate.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
                
                {certificate.pdf_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadCertificate(certificate)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCertificates.length === 0 && !loading && (
        <div className="text-center py-12">
          <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Certificates Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'No certificates match your search criteria.' 
              : 'Complete courses to earn certificates.'
            }
          </p>
          {!searchTerm && (
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/courses">Browse Courses</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Certificates;