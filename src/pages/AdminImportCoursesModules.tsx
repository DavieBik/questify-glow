import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

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

// Import Upload Step Component (inline to avoid import issues)
function ImportUploadStep({ onFileUpload, loading }: { onFileUpload: (file: File) => void, loading: boolean }) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      const allowedExtensions = ['.csv', '.xls', '.xlsx']
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        onFileUpload(file)
      } else {
        alert('Please select a valid CSV or Excel file (.csv, .xls, .xlsx)')
      }
    }
  }, [onFileUpload])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload File
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel file containing courses and modules data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium">Select a file to upload</p>
              <p className="text-sm text-muted-foreground">Supports CSV and Excel files (.csv, .xlsx)</p>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
              id="file-upload"
            />
            <Button asChild disabled={loading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {loading ? 'Uploading...' : 'Choose File'}
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Field Mapping Step Component (inline)
function ImportMappingStep({ 
  detectedColumns, 
  targetFields, 
  mapping, 
  onMappingChange, 
  onComplete, 
  loading 
}: {
  detectedColumns: string[]
  targetFields: { course: any[], module: any[] }
  mapping: Record<string, string>
  onMappingChange: (mapping: Record<string, string>) => void
  onComplete: (mapping: Record<string, string>) => void
  loading: boolean
}) {
  const handleMappingUpdate = (column: string, target: string) => {
    const newMapping = { ...mapping }
    if (target === '') {
      delete newMapping[column]
    } else {
      newMapping[column] = target
    }
    onMappingChange(newMapping)
  }

  const handleComplete = () => {
    onComplete(mapping)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Fields</CardTitle>
        <CardDescription>
          Map your CSV columns to the target fields in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Course Fields</h3>
            <div className="space-y-3">
              {targetFields.course.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {field.label}
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={Object.entries(mapping).find(([_, target]) => target === field.key)?.[0] || ''}
                    onChange={(e) => {
                      // Remove existing mapping to this target
                      const currentColumn = Object.entries(mapping).find(([_, target]) => target === field.key)?.[0]
                      if (currentColumn) {
                        handleMappingUpdate(currentColumn, '')
                      }
                      // Add new mapping
                      if (e.target.value) {
                        handleMappingUpdate(e.target.value, field.key)
                      }
                    }}
                  >
                    <option value="">Select column...</option>
                    {detectedColumns.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Module Fields</h3>
            <div className="space-y-3">
              {targetFields.module.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {field.label}
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={Object.entries(mapping).find(([_, target]) => target === field.key)?.[0] || ''}
                    onChange={(e) => {
                      // Remove existing mapping to this target
                      const currentColumn = Object.entries(mapping).find(([_, target]) => target === field.key)?.[0]
                      if (currentColumn) {
                        handleMappingUpdate(currentColumn, '')
                      }
                      // Add new mapping
                      if (e.target.value) {
                        handleMappingUpdate(e.target.value, field.key)
                      }
                    }}
                  >
                    <option value="">Select column...</option>
                    {detectedColumns.map((column) => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleComplete} disabled={loading}>
            Continue to Validation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Validation Step Component (inline)
function ImportDryRunStep({ 
  job, 
  validationResult, 
  validationErrors, 
  onDryRun, 
  onCommit, 
  loading 
}: {
  job: any
  validationResult: any
  validationErrors: any[]
  onDryRun: () => void
  onCommit: () => void
  loading: boolean
}) {
  const hasErrors = validationErrors.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Validation
        </CardTitle>
        <CardDescription>
          Validate your data before importing into the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!validationResult ? (
          <div className="text-center py-8">
            <Button onClick={onDryRun} disabled={loading} size="lg">
              {loading ? 'Validating...' : 'Run Validation'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasErrors ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {validationErrors.length} validation errors. Please review and fix them before importing.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Validation passed! Ready to import {validationResult.rows} rows.
                </AlertDescription>
              </Alert>
            )}

            {hasErrors && (
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Error</th>
                      <th className="px-3 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationErrors.map((error, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{error.row_number}</td>
                        <td className="px-3 py-2">{error.code}</td>
                        <td className="px-3 py-2">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={onDryRun} disabled={loading}>
                Re-validate
              </Button>
              {!hasErrors && (
                <Button onClick={onCommit} disabled={loading}>
                  {loading ? 'Importing...' : 'Import Data'}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Completion Step Component (inline)
function ImportCommitStep({ commitResult, onReset }: { commitResult: any, onReset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-accent" />
          Import Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {commitResult?.totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-primary">{commitResult.totals.createdCourses}</div>
              <div className="text-sm text-muted-foreground">Courses Created</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-secondary-foreground">{commitResult.totals.updatedCourses}</div>
              <div className="text-sm text-muted-foreground">Courses Updated</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-primary">{commitResult.totals.createdModules}</div>
              <div className="text-sm text-muted-foreground">Modules Created</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-secondary-foreground">{commitResult.totals.updatedModules}</div>
              <div className="text-sm text-muted-foreground">Modules Updated</div>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <Button onClick={onReset} variant="outline">
            <ArrowRight className="h-4 w-4 mr-2" />
            Start New Import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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

      // Parse file to detect columns (simplified version)
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
          Professional-grade CSV/XLSX importer with validation, mapping, and error handling.
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