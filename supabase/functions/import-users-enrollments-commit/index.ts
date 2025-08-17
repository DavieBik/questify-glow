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

interface CommitResult {
  success: boolean
  users_created: number
  enrollments_created: number
  enrollments_updated: number
  total_processed: number
  errors: Array<{
    row: number
    message: string
  }>
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (line.trim()) {
      const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''))
      rows.push(fields)
    }
  }
  
  return rows
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Regular client for other operations
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

    const { job_id } = await req.json()

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

    if (job.status !== 'mapped') {
      throw new Error('Job must be in mapped status to commit')
    }

    // Get mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('import_mappings')
      .select('*')
      .eq('job_id', job_id)

    if (mappingsError || !mappings) {
      throw new Error('Import mappings not found')
    }

    // Download and parse file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('imports')
      .download(job.file_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    const fileText = await fileData.text()
    const rows = parseCSV(fileText)
    const headers = rows[0]
    const dataRows = rows.slice(1)

    // Create field mapping
    const fieldMapping: Record<string, number> = {}
    for (const mapping of mappings) {
      const columnIndex = headers.indexOf(mapping.source_column)
      if (columnIndex !== -1) {
        fieldMapping[mapping.target_column] = columnIndex
      }
    }

    // Parse data
    const validRows: ParsedRow[] = []
    const errors: Array<{ row: number; message: string }> = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNum = i + 2

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

        // Basic validation
        if (parsedRow.user_email && parsedRow.course_external_id && parsedRow.role) {
          validRows.push(parsedRow)
        } else {
          errors.push({
            row: rowNum,
            message: 'Missing required fields'
          })
        }
      } catch (error) {
        errors.push({
          row: rowNum,
          message: `Parse error: ${error.message}`
        })
      }
    }

    if (validRows.length === 0) {
      throw new Error('No valid rows to process')
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({ status: 'processing' })
      .eq('id', job_id)

    // Get existing users and courses
    const userEmails = [...new Set(validRows.map(r => r.user_email))]
    const courseExternalIds = [...new Set(validRows.map(r => r.course_external_id))]

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUserMap = new Map(
      existingUsers.users?.map(u => [u.email?.toLowerCase(), u.id]) || []
    )

    const { data: existingCourses } = await supabase
      .from('courses')
      .select('id, external_id')
      .in('external_id', courseExternalIds)

    const courseMap = new Map(
      existingCourses?.map(c => [c.external_id, c.id]) || []
    )

    let usersCreated = 0
    let enrollmentsCreated = 0
    let enrollmentsUpdated = 0

    // Process each row
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      
      try {
        // Get or create user
        let userId = existingUserMap.get(row.user_email)

        if (!userId) {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: row.user_email,
            email_confirm: true,
            user_metadata: {
              first_name: row.first_name || '',
              last_name: row.last_name || ''
            }
          })

          if (createError) {
            errors.push({
              row: i + 2,
              message: `Failed to create user: ${createError.message}`
            })
            continue
          }

          userId = newUser.user.id
          existingUserMap.set(row.user_email, userId)
          usersCreated++

          // Create profile
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              external_id: row.user_external_id,
              first_name: row.first_name,
              last_name: row.last_name
            })

        } else if (row.user_external_id || row.first_name || row.last_name) {
          // Update existing profile with new data
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              external_id: row.user_external_id,
              first_name: row.first_name,
              last_name: row.last_name
            })
        }

        // Get course ID
        const courseId = courseMap.get(row.course_external_id)
        if (!courseId) {
          errors.push({
            row: i + 2,
            message: `Course not found: ${row.course_external_id}`
          })
          continue
        }

        // Create or update enrollment
        const enrollmentData: any = {
          user_id: userId,
          course_id: courseId,
          role: row.role
        }

        if (row.due_at) {
          enrollmentData.due_at = new Date(row.due_at).toISOString()
        }

        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .upsert(enrollmentData, {
            onConflict: 'user_id,course_id'
          })

        if (enrollmentError) {
          errors.push({
            row: i + 2,
            message: `Failed to create enrollment: ${enrollmentError.message}`
          })
          continue
        }

        enrollmentsCreated++ // Note: This counts both new and updated enrollments

      } catch (error) {
        errors.push({
          row: i + 2,
          message: `Processing error: ${error.message}`
        })
      }
    }

    const result: CommitResult = {
      success: true,
      users_created: usersCreated,
      enrollments_created: enrollmentsCreated,
      enrollments_updated: 0, // Upsert doesn't distinguish
      total_processed: validRows.length,
      errors: errors.slice(0, 50) // Limit errors
    }

    // Update job with final status
    await supabase
      .from('import_jobs')
      .update({
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        totals: {
          ...job.totals,
          users_created: usersCreated,
          enrollments_created: enrollmentsCreated,
          error_count: errors.length
        }
      })
      .eq('id', job_id)

    console.log(`Import completed for job ${job_id}: ${usersCreated} users, ${enrollmentsCreated} enrollments`)

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
    console.error('Commit error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Import failed'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})