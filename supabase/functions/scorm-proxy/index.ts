import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lightweight MIME type mapping
const getMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'htm': 'text/html', 
    'js': 'application/javascript',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'swf': 'application/x-shockwave-flash'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Expected path: /scorm-proxy/[packageId]/[...filePath]
    if (pathParts.length < 2 || pathParts[0] !== 'scorm-proxy') {
      return new Response('Invalid path', { status: 400, headers: corsHeaders })
    }

    const packageId = pathParts[1]
    const filePath = pathParts.slice(2).join('/') || 'index.html'

    console.log(`SCORM Proxy: packageId=${packageId}, filePath=${filePath}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up the package record to get storage path
    const { data: packageData, error: packageError } = await supabase
      .from('scorm_packages')
      .select('storage_path, title')
      .eq('id', packageId)
      .single()

    if (packageError || !packageData) {
      console.error('Package not found:', packageError)
      return new Response('SCORM package not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Construct the full storage path
    const storagePath = `${packageData.storage_path}/${filePath}`
    console.log(`Fetching from storage: ${storagePath}`)

    // Read file from private 'scorm' storage bucket
    const { data: fileData, error: storageError } = await supabase.storage
      .from('scorm')
      .download(storagePath)

    if (storageError || !fileData) {
      console.error('Storage error:', storageError)
      return new Response('File not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Determine content type
    const contentType = getMimeType(filePath)
    
    // Set up response headers
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Length': uint8Array.length.toString(),
    }

    // For HTML files, inject SCORM API bridge if needed
    if (contentType === 'text/html') {
      let htmlContent = new TextDecoder().decode(uint8Array)
      
      // Inject SCORM API bridge script if not already present
      if (!htmlContent.includes('scorm-api-bridge')) {
        const apiScript = `
<script id="scorm-api-bridge">
// SCORM API Bridge - ensures API is available from parent window
(function() {
  if (window.parent && window.parent !== window) {
    // Check for SCORM 1.2 API
    if (window.parent.API && !window.API) {
      window.API = window.parent.API;
      console.log('SCORM 1.2 API bridged from parent');
    }
    
    // Check for SCORM 2004 API  
    if (window.parent.API_1484_11 && !window.API_1484_11) {
      window.API_1484_11 = window.parent.API_1484_11;
      console.log('SCORM 2004 API bridged from parent');
    }
  }
})();
</script>`
        
        // Insert script before </head> or at beginning of <body>
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `${apiScript}\n</head>`)
        } else if (htmlContent.includes('<body>')) {
          htmlContent = htmlContent.replace('<body>', `<body>\n${apiScript}`)
        } else {
          htmlContent = apiScript + htmlContent
        }
      }
      
      // Convert back to bytes
      const modifiedBytes = new TextEncoder().encode(htmlContent)
      responseHeaders['Content-Length'] = modifiedBytes.length.toString()
      
      return new Response(modifiedBytes, {
        headers: responseHeaders
      })
    }

    // Stream file with correct headers
    return new Response(uint8Array, {
      headers: responseHeaders
    })

  } catch (error) {
    console.error('SCORM Proxy Error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})