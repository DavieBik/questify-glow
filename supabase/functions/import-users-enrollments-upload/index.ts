import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the user from the authorization header
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('No file provided')
    }

    const fileName = file.name
    const fileType = file.type
    
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!allowedTypes.includes(fileType) && !fileName.match(/\.(csv|xls|xlsx)$/i)) {
      throw new Error('Invalid file type. Please upload a CSV, XLS, or XLSX file.')
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer()
    const fileSize = fileBuffer.byteLength
    
    // Check file size (10MB limit)
    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB.')
    }

    // Store file in Supabase Storage
    const filePath = `imports/users-enrollments/${Date.now()}-${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('imports')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error('Failed to upload file')
    }

    // Create import job record
    const { data: jobData, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        kind: 'users-enrollments',
        status: 'uploaded',
        file_path: filePath,
        original_filename: fileName,
        created_by: user.id,
        totals: { file_size: fileSize }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      throw new Error('Failed to create import job')
    }

    console.log(`Import job created: ${jobData.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobData.id,
        message: `File uploaded successfully. Size: ${Math.round(fileSize / 1024)} KB`,
        file_path: filePath
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Upload error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Upload failed'
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