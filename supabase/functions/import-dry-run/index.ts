import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as XLSX from "https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportMapping {
  source_column: string
  target_column: string
  required: boolean
}

interface ValidationError {
  row_number: number
  code: string
  message: string
  raw: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { job_id, mapping } = await req.json()

      if (!job_id || !mapping) {
        return new Response(
          JSON.stringify({ error: 'job_id and mapping are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get the import job
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', job_id)
        .eq('created_by', user.id)
        .single()

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Import job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Save mapping
      await supabase.from('import_mappings').delete().eq('job_id', job_id)
      
      const mappingData = Object.entries(mapping).map(([source, target]) => ({
        job_id,
        source_column: source,
        target_column: target as string,
        required: isRequiredField(target as string, job.kind)
      }))

      await supabase.from('import_mappings').insert(mappingData)

      // Download and parse file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('imports')
        .download(job.file_path)

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'Failed to download file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Parse file based on type
      const fileBuffer = await fileData.arrayBuffer()
      let rows: any[] = []
      
      try {
        if (job.original_filename.endsWith('.csv')) {
          const text = new TextDecoder().decode(fileBuffer)
          rows = parseCSV(text)
        } else {
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          rows = XLSX.utils.sheet_to_json(firstSheet)
        }
      } catch (parseError) {
        console.error('Parse error:', parseError)
        return new Response(
          JSON.stringify({ error: 'Failed to parse file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Normalize headers and validate data
      const normalizedRows = rows.map((row, index) => {
        const normalizedRow: any = {}
        Object.entries(mapping).forEach(([source, target]) => {
          const value = row[source]
          if (value !== undefined && value !== null && value !== '') {
            normalizedRow[target as string] = String(value).trim()
          }
        })
        normalizedRow._row_number = index + 2 // Account for header row
        return normalizedRow
      })

      // Validate rows
      const errors: ValidationError[] = []
      const validatedRows = normalizedRows.map(row => {
        const rowErrors = validateRow(row, job.kind)
        errors.push(...rowErrors)
        return row
      })

      // Clear previous errors and insert new ones
      await supabase.from('import_job_errors').delete().eq('job_id', job_id)
      
      if (errors.length > 0) {
        const errorData = errors.map(error => ({
          job_id,
          row_number: error.row_number,
          code: error.code,
          message: error.message,
          raw: error.raw
        }))
        
        await supabase.from('import_job_errors').insert(errorData)
      }

      // Update job status
      const newStatus = errors.length === 0 ? 'validated' : 'uploaded'
      await supabase
        .from('import_jobs')
        .update({ status: newStatus })
        .eq('id', job_id)

      return new Response(
        JSON.stringify({
          rows: validatedRows,
          errors_count: errors.length,
          sample_errors: errors.slice(0, 10),
          status: newStatus
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })
}

function isRequiredField(field: string, kind: string): boolean {
  if (kind === 'courses_modules') {
    return ['external_id', 'title'].includes(field) || 
           (field.startsWith('module_') && ['external_id', 'course_external_id', 'title'].includes(field.replace('module_', '')))
  }
  return false
}

function validateRow(row: any, kind: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (kind === 'courses_modules') {
    // Validate course fields
    if (!row.external_id) {
      errors.push({
        row_number: row._row_number,
        code: 'MISSING_REQUIRED_FIELD',
        message: 'external_id is required',
        raw: row
      })
    }
    
    if (!row.title) {
      errors.push({
        row_number: row._row_number,
        code: 'MISSING_REQUIRED_FIELD',
        message: 'title is required',
        raw: row
      })
    }
    
    // Validate module fields if present
    if (row.module_external_id) {
      if (!row.module_course_external_id) {
        errors.push({
          row_number: row._row_number,
          code: 'MISSING_REQUIRED_FIELD',
          message: 'module_course_external_id is required when module_external_id is provided',
          raw: row
        })
      }
      
      if (!row.module_title) {
        errors.push({
          row_number: row._row_number,
          code: 'MISSING_REQUIRED_FIELD',
          message: 'module_title is required when module_external_id is provided',
          raw: row
        })
      }
      
      if (row.module_type && !['video', 'pdf', 'scorm', 'link', 'survey'].includes(row.module_type)) {
        errors.push({
          row_number: row._row_number,
          code: 'INVALID_VALUE',
          message: 'module_type must be one of: video, pdf, scorm, link, survey',
          raw: row
        })
      }
    }
  }
  
  return errors
}