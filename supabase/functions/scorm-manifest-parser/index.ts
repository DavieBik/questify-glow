import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ManifestData {
  title: string;
  version: string;
  entryPath: string;
  organization: string;
}

const parseScormManifest = (xmlContent: string): ManifestData => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  if (!doc) {
    throw new Error('Failed to parse XML');
  }

  // Get manifest element to determine SCORM version
  const manifest = doc.querySelector('manifest');
  if (!manifest) {
    throw new Error('Invalid SCORM package: No manifest element found');
  }

  // Detect SCORM version from schema
  const version = manifest.getAttribute('schemaversion') || 
                 manifest.getAttribute('version') || 
                 '1.2'; // default to 1.2

  const scormVersion = version.startsWith('2004') || version.includes('1.3') || version.includes('1.4') ? '2004' : '1.2';

  // Get title from metadata
  let title = 'Untitled SCORM Package';
  const titleElement = doc.querySelector('title');
  if (titleElement?.textContent) {
    title = titleElement.textContent.trim();
  }

  // Get default organization
  const defaultOrg = manifest.getAttribute('default');
  let orgSelector = 'organization';
  if (defaultOrg) {
    orgSelector = `organization[identifier="${defaultOrg}"]`;
  }

  const organization = doc.querySelector(orgSelector);
  if (!organization) {
    throw new Error('No default organization found in manifest');
  }

  const orgTitle = organization.querySelector('title')?.textContent?.trim();
  if (orgTitle) {
    title = orgTitle; // Use organization title if available
  }

  // Find the first SCO (Sharable Content Object) in the organization
  const items = organization.querySelectorAll('item');
  let entryPath = '';

  for (const item of items) {
    const identifierref = item.getAttribute('identifierref');
    if (identifierref) {
      // Find the resource with this identifier
      const resource = doc.querySelector(`resource[identifier="${identifierref}"]`);
      if (resource) {
        const href = resource.getAttribute('href');
        if (href) {
          entryPath = href;
          break;
        }
      }
    }
  }

  if (!entryPath) {
    // Fallback: look for any resource with an href
    const firstResource = doc.querySelector('resource[href]');
    if (firstResource) {
      entryPath = firstResource.getAttribute('href') || '';
    }
  }

  if (!entryPath) {
    throw new Error('No launch file found in manifest');
  }

  return {
    title,
    version: scormVersion,
    entryPath,
    organization: organization.getAttribute('identifier') || 'default'
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageId } = await req.json();

    if (!packageId) {
      return new Response(
        JSON.stringify({ error: 'Package ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing SCORM manifest for package: ${packageId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('scorm_packages')
      .select('storage_path, title')
      .eq('id', packageId)
      .maybeSingle();

    if (packageError || !packageData) {
      console.error('Package not found:', packageError);
      return new Response(
        JSON.stringify({ error: 'SCORM package not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download and parse imsmanifest.xml
    const manifestPath = `${packageData.storage_path}/imsmanifest.xml`;
    console.log(`Downloading manifest from: ${manifestPath}`);

    const { data: manifestFile, error: downloadError } = await supabase.storage
      .from('scorm')
      .download(manifestPath);

    if (downloadError || !manifestFile) {
      console.error('Failed to download manifest:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Could not find imsmanifest.xml in package' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert blob to text
    const xmlContent = await manifestFile.text();
    console.log('Manifest content length:', xmlContent.length);

    // Parse the manifest
    const manifestData = parseScormManifest(xmlContent);
    console.log('Parsed manifest:', manifestData);

    // Update the package with parsed data
    const { error: updateError } = await supabase
      .from('scorm_packages')
      .update({
        title: manifestData.title,
        version: manifestData.version,
        entry_path: manifestData.entryPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId);

    if (updateError) {
      console.error('Failed to update package:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update package with manifest data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: manifestData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('SCORM manifest parsing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse SCORM manifest' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});