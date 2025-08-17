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

// Step components - importing individually to debug
import { ImportUploadStep } from '@/components/imports/ImportUploadStep'

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
  const [loading, setLoading] = useState(false)

  const steps = [
    { id: 0, title: 'Upload', icon: Upload, description: 'Upload CSV or Excel file' },
    { id: 1, title: 'Map Fields', icon: FileText, description: 'Map columns to target fields' },
    { id: 2, title: 'Validate', icon: AlertCircle, description: 'Check for errors' },
    { id: 3, title: 'Import', icon: CheckCircle, description: 'Complete the import' }
  ]

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true)
    try {
      console.log('Uploading file:', file.name)
      // For now, just show success
      toast({
        title: 'File uploaded',
        description: `${file.name} ready for processing`
      })
      setCurrentStep(1)
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

        {currentStep >= 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Additional functionality coming soon...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AdminImportCoursesModules