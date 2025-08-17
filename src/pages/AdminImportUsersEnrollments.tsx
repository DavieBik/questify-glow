import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Users, FileSpreadsheet, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, validateFileType, formatFileSize } from '@/lib/parsers/fileParser';
import { useToast } from '@/hooks/use-toast';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'commit';

interface ImportJob {
  id: string;
  status: string;
  file_path: string;
  original_filename: string;
}

interface DryRunResult {
  total_rows: number;
  valid_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  sample_data: any[];
  new_users_count: number;
  existing_users_count: number;
  new_enrollments_count: number;
}

const EXPECTED_FIELDS = [
  { key: 'user_email', label: 'User Email', required: true, description: 'Email address of the user' },
  { key: 'user_external_id', label: 'User External ID', required: false, description: 'Optional external identifier for the user' },
  { key: 'first_name', label: 'First Name', required: false, description: 'User\'s first name' },
  { key: 'last_name', label: 'Last Name', required: false, description: 'User\'s last name' },
  { key: 'course_external_id', label: 'Course External ID', required: true, description: 'External identifier of the course' },
  { key: 'role', label: 'Role', required: true, description: 'User role in the course (student, staff, manager)' },
  { key: 'due_at', label: 'Due Date', required: false, description: 'Optional due date for the enrollment (YYYY-MM-DD format)' }
];

export default function AdminImportUsersEnrollments() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [commitResult, setCommitResult] = useState<any>(null);

  // File Upload Step
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || !validateFileType(file)) {
      setError('Invalid file type. Please upload a CSV, XLS, or XLSX file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse file to get columns
      const parsedData = await parseFile(file);
      if (!parsedData.data || parsedData.data.length === 0) {
        throw new Error('File is empty or could not be parsed');
      }

      setDetectedColumns(Object.keys(parsedData.data[0]));

      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('import-users-enrollments-upload', {
        body: formData
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setImportJob({
        id: data.job_id,
        status: 'uploaded',
        file_path: data.file_path,
        original_filename: file.name
      });

      setCurrentStep('mapping');
      toast({
        title: 'File uploaded successfully',
        description: `${formatFileSize(file.size)} uploaded and ready for mapping.`
      });

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Mapping Step
  const handleMappingComplete = useCallback(async () => {
    if (!importJob) return;

    setLoading(true);
    setError(null);

    try {
      // Save mappings
      const mappingArray = Object.entries(mapping).map(([target, source]) => ({
        job_id: importJob.id,
        target_column: target,
        source_column: source,
        required: EXPECTED_FIELDS.find(f => f.key === target)?.required || false
      }));

      const { error: mappingsError } = await supabase
        .from('import_mappings')
        .delete()
        .eq('job_id', importJob.id);

      if (mappingsError) throw mappingsError;

      const { error: insertError } = await supabase
        .from('import_mappings')
        .insert(mappingArray);

      if (insertError) throw insertError;

      // Run dry run
      const { data, error } = await supabase.functions.invoke('import-users-enrollments-dry-run', {
        body: { job_id: importJob.id, mappings: mappingArray }
      });

      if (error) throw error;

      if (!data || data.error) {
        throw new Error(data?.error || 'Dry run failed');
      }

      setDryRunResult(data);
      setCurrentStep('preview');

    } catch (err: any) {
      console.error('Mapping error:', err);
      setError(err.message || 'Failed to process mappings');
    } finally {
      setLoading(false);
    }
  }, [importJob, mapping]);

  // Commit Step
  const handleCommit = useCallback(async () => {
    if (!importJob) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-users-enrollments-commit', {
        body: { job_id: importJob.id }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setCommitResult(data);
      setCurrentStep('commit');
      
      toast({
        title: 'Import completed successfully',
        description: `Created ${data.users_created} users and ${data.enrollments_created} enrollments.`
      });

    } catch (err: any) {
      console.error('Commit error:', err);
      setError(err.message || 'Failed to complete import');
    } finally {
      setLoading(false);
    }
  }, [importJob, toast]);

  const resetImport = () => {
    setCurrentStep('upload');
    setImportJob(null);
    setDetectedColumns([]);
    setMapping({});
    setDryRunResult(null);
    setCommitResult(null);
    setError(null);
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'upload': return 1;
      case 'mapping': return 2;
      case 'preview': return 3;
      case 'commit': return 4;
      default: return 1;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Import Users & Enrollments
            </h1>
            <p className="text-muted-foreground">
              Import users and their course enrollments from CSV or Excel files
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { step: 1, label: 'Upload', icon: Upload },
            { step: 2, label: 'Map Fields', icon: FileSpreadsheet },
            { step: 3, label: 'Preview', icon: FileSpreadsheet },
            { step: 4, label: 'Import', icon: Users }
          ].map(({ step, label, icon: Icon }) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step <= getStepNumber() 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step < getStepNumber() ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={`ml-2 text-sm ${
                step <= getStepNumber() ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
              {step < 4 && (
                <div className={`w-8 h-px mx-2 ${
                  step < getStepNumber() ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {currentStep === 'upload' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>File Requirements</CardTitle>
                <CardDescription>
                  Please ensure your file meets these requirements before uploading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Supported Formats</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CSV files (.csv)</li>
                    <li>• Excel files (.xls, .xlsx)</li>
                    <li>• Maximum file size: 10MB</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Required Columns</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {EXPECTED_FIELDS.filter(f => f.required).map(field => (
                      <li key={field.key}>• {field.label}: {field.description}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Optional Columns</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {EXPECTED_FIELDS.filter(f => !f.required).map(field => (
                      <li key={field.key}>• {field.label}: {field.description}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload File
                </CardTitle>
                <CardDescription>
                  Select a CSV or Excel file containing user and enrollment data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <Button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? 'Uploading...' : 'Select File'}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop your file here
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </div>
                {loading && (
                  <div className="mt-4">
                    <Progress value={undefined} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-2">Uploading and processing file...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {currentStep === 'mapping' && (
          <Card>
            <CardHeader>
              <CardTitle>Map Your Data Fields</CardTitle>
              <CardDescription>
                Match your file columns to the expected data fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {EXPECTED_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">{field.label}</label>
                      {field.required && <span className="text-destructive">*</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  </div>
                  <div className="w-64">
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select column...</option>
                      {detectedColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setCurrentStep('upload')} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={handleMappingComplete}
                  disabled={loading || !EXPECTED_FIELDS.filter(f => f.required).every(f => mapping[f.key])}
                >
                  {loading ? 'Processing...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'preview' && dryRunResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription>
                Review the data before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{dryRunResult.total_rows}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-2xl font-bold text-green-600">{dryRunResult.valid_rows}</div>
                  <div className="text-sm text-muted-foreground">Valid Rows</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-2xl font-bold text-blue-600">{dryRunResult.new_users_count}</div>
                  <div className="text-sm text-muted-foreground">New Users</div>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-2xl font-bold text-purple-600">{dryRunResult.new_enrollments_count}</div>
                  <div className="text-sm text-muted-foreground">Enrollments</div>
                </div>
              </div>

              {dryRunResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Errors ({dryRunResult.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {dryRunResult.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setCurrentStep('mapping')} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={handleCommit}
                  disabled={loading || dryRunResult.valid_rows === 0}
                >
                  {loading ? 'Importing...' : `Import ${dryRunResult.valid_rows} Records`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'commit' && commitResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import Complete
              </CardTitle>
              <CardDescription>
                Your users and enrollments have been imported successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-2xl font-bold text-green-600">{commitResult.users_created}</div>
                  <div className="text-sm text-muted-foreground">Users Created</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-2xl font-bold text-blue-600">{commitResult.enrollments_created}</div>
                  <div className="text-sm text-muted-foreground">Enrollments Created</div>
                </div>
              </div>

              {commitResult.errors && commitResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Issues ({commitResult.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {commitResult.errors.slice(0, 10).map((error: any, idx: number) => (
                      <div key={idx} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetImport}>
                Import Another File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}