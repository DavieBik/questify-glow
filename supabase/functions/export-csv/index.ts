import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { export_type, date_from, date_to, department_filter } = await req.json();

    console.log('CSV Export request:', { export_type, date_from, date_to, department_filter });

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (export_type) {
      case 'team_compliance':
        const { data: complianceData, error: complianceError } = await supabaseClient
          .rpc('rpc_team_compliance', {
            date_from: date_from || undefined,
            date_to: date_to || undefined,
            department_filter: department_filter || null
          });

        if (complianceError) throw complianceError;
        
        data = complianceData || [];
        filename = `team_compliance_${new Date().toISOString().split('T')[0]}.csv`;
        headers = [
          'User Name', 'Email', 'Department', 'Role', 
          'Required Courses', 'Assigned Courses', 'Completed Courses', 
          'Overdue Courses', 'Completion %', 'Last Activity'
        ];
        break;

      case 'approvals_queue':
        const { data: approvalsData, error: approvalsError } = await supabaseClient
          .rpc('rpc_approvals_queue');

        if (approvalsError) throw approvalsError;
        
        data = approvalsData || [];
        filename = `approvals_queue_${new Date().toISOString().split('T')[0]}.csv`;
        headers = [
          'User Name', 'Email', 'Course Title', 'Request Type', 
          'Requested At', 'Status', 'Reviewer Notes'
        ];
        break;

      default:
        throw new Error('Invalid export type');
    }

    // Generate CSV content
    const csvContent = generateCSV(data, headers, export_type);

    console.log(`Generated CSV for ${export_type}, ${data.length} rows`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('CSV Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateCSV(data: any[], headers: string[], exportType: string): string {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = [];
    
    switch (exportType) {
      case 'team_compliance':
        values.push(
          escapeCSV(row.user_name),
          escapeCSV(row.email),
          escapeCSV(row.department),
          escapeCSV(row.role),
          row.required_courses || 0,
          row.assigned_courses || 0,
          row.completed_courses || 0,
          row.overdue_courses || 0,
          row.completion_percentage || 0,
          row.last_activity || ''
        );
        break;
        
      case 'approvals_queue':
        values.push(
          escapeCSV(row.user_name),
          escapeCSV(row.user_email),
          escapeCSV(row.course_title),
          escapeCSV(row.request_type),
          row.requested_at ? new Date(row.requested_at).toLocaleString() : '',
          escapeCSV(row.status),
          escapeCSV(row.reviewer_notes || '')
        );
        break;
    }
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}