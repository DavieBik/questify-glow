import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, RotateCcw } from 'lucide-react'

interface ImportCommitStepProps {
  commitResult: any
  onReset: () => void
}

export function ImportCommitStep({ commitResult, onReset }: ImportCommitStepProps) {
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
            <RotateCcw className="h-4 w-4 mr-2" />
            Start New Import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}