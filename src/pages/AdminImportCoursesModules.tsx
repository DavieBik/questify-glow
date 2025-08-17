import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { ImportUploadStep } from '@/components/imports/ImportUploadStep'
import { ImportMappingStep } from '@/components/imports/ImportMappingStep'
import { ImportDryRunStep } from '@/components/imports/ImportDryRunStep'
import { ImportCommitStep } from '@/components/imports/ImportCommitStep'

interface ImportJob {
  id: string
  kind: string
  source: string
  status: string
  original_filename?: string
  created_at: string
  totals?: any
}

interface ImportError {
  id: string
  row_number: number
  code: string
  message: string
  raw?: any
}

const AdminImportCoursesModules = () => {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([])
  const [validationResult, setValidationResult] = useState<any>(null)
  const [commitResult, setCommitResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const steps = [
    { id: 0, title: 'Upload', icon: Upload, description: 'Upload CSV or Excel file' },
    { id: 1, title: 'Map Fields', icon: FileText, description: 'Map columns to target fields' },
    { id: 2, title: 'Validate', icon: AlertCircle, description: 'Check for errors' },
    { id: 3, title: 'Import', icon: CheckCircle, description: 'Complete the import' }
  ]

  const targetFields = {
    course: [
      { key: 'external_id', label: 'External ID', required: true },
      { key: 'title', label: 'Title', required: true },
      { key: 'description', label: 'Description', required: false },
      { key: 'duration_minutes', label: 'Duration (minutes)', required: false },
      { key: 'category', label: 'Category', required: false },
      { key: 'difficulty', label: 'Difficulty', required: false },
      { key: 'visibility', label: 'Visibility', required: false },
      { key: 'code', label: 'Course Code', required: false },
      { key: 'color', label: 'Color', required: false }
    ],
    module: [
      { key: 'module_external_id', label: 'Module External ID', required: false },
      { key: 'module_course_external_id', label: 'Module Course External ID', required: false },
      { key: 'module_title', label: 'Module Title', required: false },
      { key: 'module_type', label: 'Module Type', required: false },
      { key: 'module_content_url', label: 'Module Content URL', required: false },
      { key: 'module_order_index', label: 'Module Order', required: false },
      { key: 'module_description', label: 'Module Description', required: false }
    ]
  }

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', 'courses_modules')

      const { data, error } = await supabase.functions.invoke('import-upload', {
        body: formData
      })

      if (error) throw error

      // Parse file to detect columns
      const fileText = await file.text()
      const lines = fileText.split('\n')
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        setDetectedColumns(headers)
      }

      // Fetch the created job
      const { data: jobData, error: jobError } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', data.job_id)
        .single()

      if (jobError) throw jobError

      setCurrentJob(jobData)
      setCurrentStep(1)
      
      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleMappingComplete = useCallback((newMapping: Record<string, string>) => {
    setMapping(newMapping)
    setCurrentStep(2)
  }, [])

  const handleDryRun = useCallback(async () => {
    if (!currentJob) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('import-dry-run', {
        body: {
          job_id: currentJob.id,
          mapping
        }
      })

      if (error) throw error

      setValidationResult(data)
      
      // Fetch errors
      const { data: errors, error: errorsError } = await supabase
        .from('import_job_errors')
        .select('*')
        .eq('job_id', currentJob.id)
        .order('row_number')

      if (errorsError) throw errorsError

      setValidationErrors(errors || [])
      
      if (data.errors_count === 0) {
        toast({
          title: 'Validation Passed',
          description: 'No errors found. Ready to import.'
        })
      } else {
        toast({
          title: 'Validation Failed',
          description: `Found ${data.errors_count} errors. Please review.`,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Validation error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Validation failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [currentJob, mapping, toast])

  const handleCommit = useCallback(async () => {
    if (!currentJob) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('import-commit', {
        body: {
          job_id: currentJob.id,
          mapping
        }
      })

      if (error) throw error

      setCommitResult(data)
      setCurrentStep(3)
      
      toast({
        title: 'Import Complete',
        description: 'Data has been successfully imported.'
      })
    } catch (error: any) {
      console.error('Commit error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Import failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [currentJob, mapping, toast])

  const resetImport = useCallback(() => {
    setCurrentStep(0)
    setCurrentJob(null)
    setDetectedColumns([])
    setMapping({})
    setValidationErrors([])
    setValidationResult(null)
    setCommitResult(null)
  }, [])

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'pending'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Courses & Modules</h1>
        <p className="text-muted-foreground">
          Upload CSV or Excel files to import courses and modules with validation and error checking.
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Import Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id)
              const Icon = step.icon
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : ''}
                    ${status === 'current' ? 'border-primary text-primary' : ''}
                    ${status === 'pending' ? 'border-muted text-muted-foreground' : ''}
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      status === 'current' ? 'text-primary' : 
                      status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-4" />
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 0 && (
          <ImportUploadStep
            onFileUpload={handleFileUpload}
            loading={loading}
          />
        )}

        {currentStep === 1 && (
          <ImportMappingStep
            detectedColumns={detectedColumns}
            targetFields={targetFields}
            mapping={mapping}
            onMappingChange={setMapping}
            onComplete={handleMappingComplete}
            loading={loading}
          />
        )}

        {currentStep === 2 && (
          <ImportDryRunStep
            job={currentJob}
            validationResult={validationResult}
            validationErrors={validationErrors}
            onDryRun={handleDryRun}
            onCommit={handleCommit}
            loading={loading}
          />
        )}

        {currentStep === 3 && (
          <ImportCommitStep
            commitResult={commitResult}
            onReset={resetImport}
          />
        )}
      </div>

      {/* Current Job Info */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Import Job
              <Badge variant={
                currentJob.status === 'committed' ? 'default' :
                currentJob.status === 'validated' ? 'secondary' :
                currentJob.status === 'failed' ? 'destructive' : 'outline'
              }>
                {currentJob.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Job ID</p>
                <p className="font-mono">{currentJob.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-muted-foreground">File</p>
                <p>{currentJob.original_filename}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source</p>
                <p>{currentJob.source}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{new Date(currentJob.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminImportCoursesModules