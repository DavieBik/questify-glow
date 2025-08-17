import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedRow {
  user_email: string
  user_external_id?: string
  first_name?: string
  last_name?: string
  course_external_id: string
  role: string
  due_at?: string
}

interface ValidationError {
  row: number
  field: string
  value: any
  message: string
}

interface DryRunResult {
  total_rows: number
  valid_rows: number
  errors: ValidationError[]
  sample_data: ParsedRow[]
  new_users_count: number
  existing_users_count: number
  new_enrollments_count: number
  existing_enrollments_count: number
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing - handles basic cases
      const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''))
      rows.push(fields)
    }
  }
  
  return rows
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateRole(role: string): boolean {
  return ['student', 'staff', 'manager'].includes(role.toLowerCase())
}

function validateDate(dateStr: string): boolean {
  if (!dateStr) return true // Optional field
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const { job_id, mappings } = await req.json()

    // Get the import job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('created_by', user.id)
      .single()

    if (jobError || !job) {
      throw new Error('Import job not found')
    }

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('imports')
      .download(job.file_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    // Parse the file
    const fileText = await fileData.text()
    const rows = parseCSV(fileText)
    
    if (rows.length === 0) {
      throw new Error('File is empty')
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    console.log('Headers found:', headers)
    console.log('Mappings:', mappings)

    // Create mapping object
    const fieldMapping: Record<string, number> = {}
    for (const mapping of mappings) {
      const columnIndex = headers.indexOf(mapping.source_column)
      if (columnIndex !== -1) {
        fieldMapping[mapping.target_column] = columnIndex
      }
    }

    console.log('Field mapping:', fieldMapping)

    // Validate required fields are mapped
    const requiredFields = ['user_email', 'course_external_id', 'role']
    for (const field of requiredFields) {
      if (!(field in fieldMapping)) {
        throw new Error(`Required field '${field}' is not mapped`)
      }
    }

    // Parse and validate data
    const errors: ValidationError[] = []
    const validRows: ParsedRow[] = []
    const userEmails = new Set<string>()
    const courseExternalIds = new Set<string>()

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNum = i + 2 // +2 because we skip header and 0-indexed

      try {
        const parsedRow: ParsedRow = {
          user_email: row[fieldMapping.user_email]?.toLowerCase()?.trim() || '',
          course_external_id: row[fieldMapping.course_external_id]?.trim() || '',
          role: row[fieldMapping.role]?.toLowerCase()?.trim() || ''
        }

        // Add optional fields
        if (fieldMapping.user_external_id !== undefined) {
          parsedRow.user_external_id = row[fieldMapping.user_external_id]?.trim()
        }
        if (fieldMapping.first_name !== undefined) {
          parsedRow.first_name = row[fieldMapping.first_name]?.trim()
        }
        if (fieldMapping.last_name !== undefined) {
          parsedRow.last_name = row[fieldMapping.last_name]?.trim()
        }
        if (fieldMapping.due_at !== undefined) {
          parsedRow.due_at = row[fieldMapping.due_at]?.trim()
        }

        // Validate required fields
        if (!parsedRow.user_email) {
          errors.push({
            row: rowNum,
            field: 'user_email',
            value: parsedRow.user_email,
            message: 'Email is required'
          })
        } else if (!validateEmail(parsedRow.user_email)) {
          errors.push({
            row: rowNum,
            field: 'user_email',
            value: parsedRow.user_email,
            message: 'Invalid email format'
          })
        }

        if (!parsedRow.course_external_id) {
          errors.push({
            row: rowNum,
            field: 'course_external_id',
            value: parsedRow.course_external_id,
            message: 'Course external ID is required'
          })
        }

        if (!parsedRow.role) {
          errors.push({
            row: rowNum,
            field: 'role',
            value: parsedRow.role,
            message: 'Role is required'
          })
        } else if (!validateRole(parsedRow.role)) {
          errors.push({
            row: rowNum,
            field: 'role',
            value: parsedRow.role,
            message: 'Role must be one of: student, staff, manager'
          })
        }

        // Validate due_at if provided
        if (parsedRow.due_at && !validateDate(parsedRow.due_at)) {
          errors.push({
            row: rowNum,
            field: 'due_at',
            value: parsedRow.due_at,
            message: 'Invalid date format'
          })
        }

        if (errors.filter(e => e.row === rowNum).length === 0) {
          validRows.push(parsedRow)
          userEmails.add(parsedRow.user_email)
          courseExternalIds.add(parsedRow.course_external_id)
        }

      } catch (error) {
        errors.push({
          row: rowNum,
          field: 'general',
          value: null,
          message: `Parse error: ${error.message}`
        })
      }
    }

    // Check which users already exist
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', Array.from(userEmails))

    const existingUserEmails = new Set(existingUsers?.map(u => u.email) || [])

    // Check which courses exist
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('external_id')
      .in('external_id', Array.from(courseExternalIds))

    const existingCourseExternalIds = new Set(existingCourses?.map(c => c.external_id) || [])

    // Validate that all courses exist
    for (const courseId of courseExternalIds) {
      if (!existingCourseExternalIds.has(courseId)) {
        errors.push({
          row: 0,
          field: 'course_external_id',
          value: courseId,
          message: `Course with external_id '${courseId}' does not exist`
        })
      }
    }

    // Count new vs existing
    const newUsersCount = Array.from(userEmails).filter(email => !existingUserEmails.has(email)).length
    const existingUsersCount = Array.from(userEmails).filter(email => existingUserEmails.has(email)).length

    const result: DryRunResult = {
      total_rows: dataRows.length,
      valid_rows: validRows.length,
      errors: errors.slice(0, 100), // Limit errors for response size
      sample_data: validRows.slice(0, 10), // Show first 10 valid rows
      new_users_count: newUsersCount,
      existing_users_count: existingUsersCount,
      new_enrollments_count: validRows.length, // All valid rows will create enrollments
      existing_enrollments_count: 0 // We'll upsert, so this is just informational
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({
        status: 'mapped',
        totals: {
          total_rows: result.total_rows,
          valid_rows: result.valid_rows,
          error_count: errors.length
        }
      })
      .eq('id', job_id)

    console.log(`Dry run completed for job ${job_id}: ${result.valid_rows}/${result.total_rows} valid rows`)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Dry run error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Dry run failed'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})