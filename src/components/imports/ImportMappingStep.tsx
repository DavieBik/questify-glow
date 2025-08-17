import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface TargetField {
  key: string
  label: string
  required: boolean
}

interface ImportMappingStepProps {
  detectedColumns: string[]
  targetFields: {
    course: TargetField[]
    module: TargetField[]
  }
  mapping: Record<string, string>
  onMappingChange: (mapping: Record<string, string>) => void
  onComplete: (mapping: Record<string, string>) => void
  loading: boolean
}

export function ImportMappingStep({ 
  detectedColumns, 
  targetFields, 
  mapping, 
  onMappingChange, 
  onComplete, 
  loading 
}: ImportMappingStepProps) {
  const handleMappingUpdate = (column: string, target: string) => {
    const newMapping = { ...mapping }
    if (target === 'none') {
      delete newMapping[column]
    } else {
      newMapping[column] = target
    }
    onMappingChange(newMapping)
  }

  const allTargetFields = [...targetFields.course, ...targetFields.module]
  const requiredFields = allTargetFields.filter(f => f.required)
  const mappedRequired = requiredFields.filter(field => 
    Object.values(mapping).includes(field.key)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Fields</CardTitle>
        <CardDescription>
          Map your file columns to the target fields. Required fields must be mapped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Course Fields</h3>
            <div className="space-y-2">
              {targetFields.course.map(field => (
                <div key={field.key} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{field.label}</span>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Module Fields</h3>
            <div className="space-y-2">
              {targetFields.module.map(field => (
                <div key={field.key} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{field.label}</span>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Column Mapping</h3>
          {detectedColumns.map(column => (
            <div key={column} className="flex items-center gap-4 p-3 border rounded">
              <div className="flex-1">
                <span className="font-medium">{column}</span>
              </div>
              <div className="flex-1">
                <Select 
                  value={mapping[column] || 'none'} 
                  onValueChange={(value) => handleMappingUpdate(column, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't map</SelectItem>
                    {allTargetFields.map(field => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label} {field.required && '(Required)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {mappedRequired.length} of {requiredFields.length} required fields mapped
          </div>
          <Button 
            onClick={() => onComplete(mapping)}
            disabled={mappedRequired.length < requiredFields.length || loading}
          >
            Continue to Validation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}