import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Share, 
  Award, 
  Calendar,
  Clock,
  User,
  FileText,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  final_score_percentage: number;
  completion_time_minutes: number;
  is_valid: boolean;
  pdf_url: string;
  pdf_storage_path: string;
  verification_url: string;
  qr_code_data: string;
  courses: {
    title: string;
    description: string;
    difficulty: string;
  };
  issued_by_user?: {
    first_name: string;
    last_name: string;
  };
}

const CertificateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchCertificateDetails();
      fetchUserProfile();
    }
  }, [id, user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCertificateDetails();
    }
  }, [id]);

  const fetchCertificateDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses (
            title,
            description,
            difficulty
          ),
          issued_by_user:users!certificates_issued_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('Error fetching certificate details:', error);
      toast.error('Failed to load certificate details');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificate?.pdf_storage_path) {
      toast.error('Certificate PDF not available');
      return;
    }

    try {
      const { downloadCertificate: downloadFn } = await import('@/lib/certificates/signedUrls');
      await downloadFn(
        certificate.pdf_storage_path,
        `certificate-${certificate.certificate_number}.pdf`
      );
      toast.success('Certificate download started');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const shareCertificate = async () => {
    if (!certificate?.verification_url) {
      toast.error('Certificate verification URL not available');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Certificate - ${certificate.courses.title}`,
          text: `I earned a certificate for completing ${certificate.courses.title}!`,
          url: certificate.verification_url,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(certificate.verification_url);
        toast.success('Certificate verification link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing certificate:', error);
      toast.error('Failed to share certificate');
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-primary/10 text-primary';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Certificate Not Found</h2>
        <p className="text-muted-foreground mb-4">The certificate you're looking for doesn't exist.</p>
        <Button asChild>
          <Link to="/certificates">Back to Certificates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="p-0 h-auto">
              <Link to="/certificates" className="text-muted-foreground hover:text-foreground">
                ← Back to Certificates
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold">Certificate of Completion</h1>
              <p className="text-muted-foreground">#{certificate.certificate_number}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Badge 
            variant={certificate.is_valid ? "default" : "destructive"}
          >
            {certificate.is_valid ? 'Valid' : 'Invalid'}
          </Badge>
          {certificate.expiry_date && isExpired(certificate.expiry_date) && (
            <Badge variant="destructive">
              Expired
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Certificate Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate Preview</CardTitle>
              <CardDescription>
                Official certificate of completion for {certificate.courses.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Beautiful Certificate Design */}
              <div className="aspect-[4/3] border-2 border-accent rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 p-8 relative">
                {/* Decorative corners */}
                <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-accent rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-accent rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-accent rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-accent rounded-br-lg"></div>
                
                <div className="text-center h-full flex flex-col justify-center space-y-4">
                  {/* Header */}
                  <div>
                    <Award className="h-16 w-16 mx-auto text-accent mb-4" />
                    <h2 className="text-3xl font-bold text-accent mb-2">Certificate of Completion</h2>
                    <div className="w-32 h-1 bg-accent mx-auto rounded"></div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <p className="text-gray-600 text-lg">This is to certify that</p>
                     <h3 className="text-2xl font-bold text-gray-800">
                       {user?.email || 'Certificate Holder'}
                     </h3>
                    <p className="text-gray-600">has successfully completed</p>
                    <h4 className="text-xl font-semibold text-gray-800 px-4">
                      {certificate.courses.title}
                    </h4>
                    <p className="text-gray-600">
                      with a score of <span className="font-bold text-accent">{certificate.final_score_percentage}%</span>
                    </p>
                  </div>
                  
                  {/* Footer */}
                  <div className="pt-6 space-y-2">
                    <p className="text-sm text-gray-500">
                      Issued on {new Date(certificate.issue_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      Certificate #{certificate.certificate_number}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{certificate.courses.title}</h3>
                {certificate.courses.description && (
                  <p className="text-muted-foreground">{certificate.courses.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <Badge className={getDifficultyColor(certificate.courses.difficulty)}>
                  {certificate.courses.difficulty}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  Score: {certificate.final_score_percentage}%
                </div>
                {certificate.completion_time_minutes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    Completed in {certificate.completion_time_minutes} minutes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificate.pdf_url && (
                <Button onClick={downloadCertificate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
              
              {certificate.verification_url && (
                <Button variant="outline" onClick={shareCertificate} className="w-full">
                  <Share className="h-4 w-4 mr-2" />
                  Share Certificate
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Certificate Details */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Certificate Number</span>
                  <span className="font-mono">{certificate.certificate_number}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Issue Date</span>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(certificate.issue_date).toLocaleDateString()}
                  </div>
                </div>
                
                {certificate.expiry_date && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expiry Date</span>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span className={isExpired(certificate.expiry_date) ? 'text-red-600' : ''}>
                          {new Date(certificate.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Final Score</span>
                  <span className="font-medium">{certificate.final_score_percentage}%</span>
                </div>
                
                {certificate.issued_by_user && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Issued By</span>
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>
                          {certificate.issued_by_user.first_name} {certificate.issued_by_user.last_name}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {certificate.qr_code_data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Verification QR Code
                </CardTitle>
                <CardDescription>
                  Scan to verify certificate authenticity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center p-4">
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  QR Code display requires additional implementation
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateDetail;