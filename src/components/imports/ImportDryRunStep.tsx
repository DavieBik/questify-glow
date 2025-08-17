import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Play } from 'lucide-react'

interface ImportDryRunStepProps {
  job: any
  validationResult: any
  validationErrors: any[]
  onDryRun: () => void
  onCommit: () => void
  loading: boolean
}

export function ImportDryRunStep({ 
  job, 
  validationResult, 
  validationErrors, 
  onDryRun, 
  onCommit, 
  loading 
}: ImportDryRunStepProps) {
  const hasErrors = validationErrors.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Validation & Dry Run
          </CardTitle>
          <CardDescription>
            Validate your data before importing. Fix any errors before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!validationResult ? (
            <div className="text-center py-8">
              <Button onClick={onDryRun} disabled={loading}>
                {loading ? 'Validating...' : 'Run Validation'}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will check your data for errors without importing it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {hasErrors ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-accent" />
                )}
                <span className="font-medium">
                  {hasErrors ? 'Validation Failed' : 'Validation Passed'}
                </span>
                <Badge variant={hasErrors ? 'destructive' : 'default'}>
                  {validationResult.errors_count} errors
                </Badge>
              </div>

              {hasErrors && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Found {validationResult.errors_count} errors. Please fix them before importing.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={onDryRun} disabled={loading}>
                  Re-validate
                </Button>
                <Button 
                  onClick={onCommit} 
                  disabled={hasErrors || loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? 'Importing...' : 'Import Data'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <div key={index} className="p-3 border rounded text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Row {error.row_number}</Badge>
                    <Badge variant="destructive">{error.code}</Badge>
                  </div>
                  <p>{error.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}