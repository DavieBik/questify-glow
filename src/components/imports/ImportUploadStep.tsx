import React, { useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText } from 'lucide-react'
import { validateFileType, formatFileSize } from '@/lib/parsers/fileParser'

interface ImportUploadStepProps {
  onFileUpload: (file: File) => void
  loading: boolean
}

export function ImportUploadStep({ onFileUpload, loading }: ImportUploadStepProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateFileType(file)) {
      onFileUpload(file)
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