import { supabase } from '@/integrations/supabase/client'
import { LMSConnector, ConnectorFetchResult } from './types'

export interface ConnectorRunResult {
  success: boolean
  jobId?: string
  error?: string
  totals?: {
    coursesProcessed: number
    modulesProcessed: number
    errors: number
  }
}

export class ConnectorRunner {
  private connector: LMSConnector
  
  constructor(connector: LMSConnector) {
    this.connector = connector
  }
  
  async run(options?: { since?: Date }): Promise<ConnectorRunResult> {
    try {
      // Test connection first
      const connectionOk = await this.connector.testConnection()
      if (!connectionOk) {
        return {
          success: false,
          error: `Connection test failed for connector ${this.connector.id}`
        }
      }
      
      // Fetch data from connector
      const data = await this.connector.fetchAll({ since: options?.since })
      
      // Create import job
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          kind: 'courses_modules',
          source: `connector:${this.connector.id}`,
          status: 'uploaded',
          totals: {
            coursesProcessed: data.courses.length,
            modulesProcessed: data.modules.length
          }
        })
        .select()
        .single()
      
      if (jobError) {
        return {
          success: false,
          error: `Failed to create import job: ${jobError.message}`
        }
      }
      
      // Convert connector data to import format
      const importData = this.convertToImportFormat(data)
      
      // Validate and process using the same pipeline as CSV imports
      const validationResult = await this.validateData(importData, job.id)
      
      if (validationResult.errors.length > 0) {
        // Update job status to failed
        await supabase
          .from('import_jobs')
          .update({ status: 'failed' })
          .eq('id', job.id)
        
        return {
          success: false,
          error: `Validation failed with ${validationResult.errors.length} errors`,
          jobId: job.id,
          totals: {
            coursesProcessed: data.courses.length,
            modulesProcessed: data.modules.length,
            errors: validationResult.errors.length
          }
        }
      }
      
      // Commit the data
      const commitResult = await this.commitData(importData, job.id)
      
      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
          jobId: job.id
        }
      }
      
      // Update job status to committed
      await supabase
        .from('import_jobs')
        .update({ 
          status: 'committed',
          totals: commitResult.totals
        })
        .eq('id', job.id)
      
      return {
        success: true,
        jobId: job.id,
        totals: commitResult.totals
      }
      
    } catch (error) {
      console.error('Connector run failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private convertToImportFormat(data: ConnectorFetchResult): any[] {
    const rows: any[] = []
    
    // Create a map of courses for easy lookup
    const coursesMap = new Map()
    data.courses.forEach(course => {
      coursesMap.set(course.external_id, course)
      
      // Add course row
      rows.push({
        external_id: course.external_id,
        title: course.title,
        description: course.description || '',
        duration_minutes: course.duration_minutes?.toString() || '',
        category: course.category || '',
        difficulty: course.difficulty || 'beginner',
        visibility: course.visibility || 'private',
        code: course.code || '',
        color: course.color || ''
      })
    })
    
    // Add module rows
    data.modules.forEach(module => {
      const course = coursesMap.get(module.course_external_id)
      if (course) {
        rows.push({
          external_id: course.external_id,
          title: course.title,
          description: course.description || '',
          duration_minutes: course.duration_minutes?.toString() || '',
          category: course.category || '',
          difficulty: course.difficulty || 'beginner',
          module_external_id: module.external_id,
          module_course_external_id: module.course_external_id,
          module_title: module.title,
          module_type: module.type,
          module_content_url: module.content_url || '',
          module_order_index: module.order_index?.toString() || '0',
          module_description: module.description || ''
        })
      }
    })
    
    return rows
  }
  
  private async validateData(rows: any[], jobId: string): Promise<{ errors: any[] }> {
    const errors: any[] = []
    
    rows.forEach((row, index) => {
      const rowNumber = index + 1
      
      // Validate required course fields
      if (!row.external_id) {
        errors.push({
          row_number: rowNumber,
          code: 'MISSING_REQUIRED_FIELD',
          message: 'external_id is required'
        })
      }
      
      if (!row.title) {
        errors.push({
          row_number: rowNumber,
          code: 'MISSING_REQUIRED_FIELD',
          message: 'title is required'
        })
      }
      
      // Validate module fields if present
      if (row.module_external_id) {
        if (!row.module_course_external_id) {
          errors.push({
            row_number: rowNumber,
            code: 'MISSING_REQUIRED_FIELD',
            message: 'module_course_external_id is required'
          })
        }
        
        if (!row.module_title) {
          errors.push({
            row_number: rowNumber,
            code: 'MISSING_REQUIRED_FIELD',
            message: 'module_title is required'
          })
        }
        
        if (row.module_type && !['video', 'pdf', 'scorm', 'link', 'survey'].includes(row.module_type)) {
          errors.push({
            row_number: rowNumber,
            code: 'INVALID_VALUE',
            message: 'module_type must be video, pdf, scorm, link, or survey'
          })
        }
      }
    })
    
    // Save errors to database if any
    if (errors.length > 0) {
      const errorData = errors.map(error => ({
        job_id: jobId,
        row_number: error.row_number,
        code: error.code,
        message: error.message,
        raw: {}
      }))
      
      await supabase.from('import_job_errors').insert(errorData)
    }
    
    return { errors }
  }
  
  private async commitData(rows: any[], jobId: string): Promise<{ success: boolean; error?: string; totals?: any }> {
    try {
      const totals = {
        createdCourses: 0,
        updatedCourses: 0,
        createdModules: 0,
        updatedModules: 0,
        skipped: 0
      }
      
      // Process courses
      const coursesToProcess = new Map()
      const modulesToProcess: any[] = []
      
      for (const row of rows) {
        if (row.external_id && row.title) {
          coursesToProcess.set(row.external_id, {
            external_id: row.external_id,
            title: row.title,
            description: row.description || null,
            duration_minutes: row.duration_minutes ? parseInt(row.duration_minutes) : null,
            category: row.category || null,
            difficulty: row.difficulty || 'beginner',
            is_active: true
          })
        }
        
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
          await supabase
            .from('courses')
            .update(courseData)
            .eq('external_id', courseData.external_id)
          totals.updatedCourses++
        } else {
          await supabase
            .from('courses')
            .insert(courseData)
          totals.createdCourses++
        }
      }
      
      // Process modules
      for (const moduleData of modulesToProcess) {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('external_id', moduleData.course_external_id)
          .maybeSingle()
        
        if (!course) {
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
          content_type: moduleData.type
        }
        
        if (existingModule) {
          await supabase
            .from('modules')
            .update(moduleRecord)
            .eq('external_id', moduleData.external_id)
          totals.updatedModules++
        } else {
          await supabase
            .from('modules')
            .insert(moduleRecord)
          totals.createdModules++
        }
      }
      
      return { success: true, totals }
      
    } catch (error) {
      console.error('Commit error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}