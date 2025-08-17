import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as XLSX from "https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportTotals {
  createdCourses: number
  updatedCourses: number
  createdModules: number
  updatedModules: number
  skipped: number
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

      if (job.status !== 'validated') {
        return new Response(
          JSON.stringify({ error: 'Job must be validated before committing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Download and parse file again
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('imports')
        .download(job.file_path)

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'Failed to download file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

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

      // Normalize rows
      const normalizedRows = rows.map(row => {
        const normalizedRow: any = {}
        Object.entries(mapping).forEach(([source, target]) => {
          const value = row[source]
          if (value !== undefined && value !== null && value !== '') {
            normalizedRow[target as string] = String(value).trim()
          }
        })
        return normalizedRow
      })

      // Execute import in transaction
      try {
        const totals: ImportTotals = {
          createdCourses: 0,
          updatedCourses: 0,
          createdModules: 0,
          updatedModules: 0,
          skipped: 0
        }

        // Process courses first
        const coursesToProcess = new Map()
        const modulesToProcess: any[] = []

        for (const row of normalizedRows) {
          if (row.external_id && row.title) {
            // This is a course row
            coursesToProcess.set(row.external_id, {
              external_id: row.external_id,
              title: row.title,
              description: row.description || null,
              duration_minutes: row.duration_minutes ? parseInt(row.duration_minutes) : null,
              category: row.category || null,
              difficulty: row.difficulty || 'beginner',
              is_active: true,
              organization_id: null // Will be set by RLS
            })
          }

          // Collect module data
          if (row.module_external_id && row.module_course_external_id && row.module_title) {
            modulesToProcess.push({
              external_id: row.module_external_id,
              course_external_id: row.module_course_external_id,
              title: row.module_title,
              type: row.module_type || 'pdf',
              content_url: row.module_content_url || null,
              order_index: row.module_order_index ? parseInt(row.module_order_index) : 0,
              description: row.module_description || null
            })
          }
        }

        // Upsert courses
        for (const courseData of coursesToProcess.values()) {
          const { data: existingCourse } = await supabase
            .from('courses')
            .select('id')
            .eq('external_id', courseData.external_id)
            .maybeSingle()

          if (existingCourse) {
            // Update existing course
            await supabase
              .from('courses')
              .update(courseData)
              .eq('external_id', courseData.external_id)
            
            totals.updatedCourses++
          } else {
            // Create new course
            await supabase
              .from('courses')
              .insert({
                ...courseData,
                created_by: user.id
              })
            
            totals.createdCourses++
          }
        }

        // Process modules
        for (const moduleData of modulesToProcess) {
          // Find the course ID by external_id
          const { data: course } = await supabase
            .from('courses')
            .select('id')
            .eq('external_id', moduleData.course_external_id)
            .maybeSingle()

          if (!course) {
            console.warn(`Course not found for external_id: ${moduleData.course_external_id}`)
            totals.skipped++
            continue
          }

          const { data: existingModule } = await supabase
            .from('modules')
            .select('id')
            .eq('external_id', moduleData.external_id)
            .maybeSingle()

          const moduleRecord = {
            external_id: moduleData.external_id,
            course_id: course.id,
            title: moduleData.title,
            type: moduleData.type,
            content_url: moduleData.content_url,
            order_index: moduleData.order_index,
            description: moduleData.description,
            content_type: moduleData.type, // Map type to content_type
            organization_id: null // Will be set by RLS
          }

          if (existingModule) {
            // Update existing module
            await supabase
              .from('modules')
              .update(moduleRecord)
              .eq('external_id', moduleData.external_id)
            
            totals.updatedModules++
          } else {
            // Create new module
            await supabase
              .from('modules')
              .insert(moduleRecord)
            
            totals.createdModules++
          }
        }

        // Update job with totals and status
        await supabase
          .from('import_jobs')
          .update({
            status: 'committed',
            totals: totals
          })
          .eq('id', job_id)

        return new Response(
          JSON.stringify({ 
            success: true,
            totals
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (commitError) {
        console.error('Commit error:', commitError)
        
        // Update job status to failed
        await supabase
          .from('import_jobs')
          .update({ status: 'failed' })
          .eq('id', job_id)

        return new Response(
          JSON.stringify({ error: 'Failed to commit import' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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