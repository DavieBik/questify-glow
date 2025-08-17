export interface CourseIn {
  external_id: string
  title: string
  description?: string
  duration_minutes?: number
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  visibility?: 'public' | 'private' | 'unlisted'
  code?: string
  color?: string
}

export interface ModuleIn {
  external_id: string
  course_external_id: string
  title: string
  type: 'video' | 'pdf' | 'scorm' | 'link' | 'survey'
  content_url?: string
  order_index?: number
  description?: string
}

export interface ConnectorFetchOptions {
  since?: Date
  limit?: number
}

export interface ConnectorFetchResult {
  courses: CourseIn[]
  modules: ModuleIn[]
}

export interface LMSConnector {
  id: string
  name: string
  description: string
  
  // Main fetch method
  fetchAll(options?: ConnectorFetchOptions): Promise<ConnectorFetchResult>
  
  // Health check
  testConnection(): Promise<boolean>
  
  // Configuration validation
  validateConfig(config: Record<string, any>): Promise<boolean>
}

export interface ConnectorConfig {
  id: string
  name: string
  enabled: boolean
  config: Record<string, any>
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Base connector class for extending
export abstract class BaseConnector implements LMSConnector {
  abstract id: string
  abstract name: string
  abstract description: string
  
  protected config: Record<string, any>
  
  constructor(config: Record<string, any>) {
    this.config = config
  }
  
  abstract fetchAll(options?: ConnectorFetchOptions): Promise<ConnectorFetchResult>
  abstract testConnection(): Promise<boolean>
  abstract validateConfig(config: Record<string, any>): Promise<boolean>
  
  protected normalizeString(str: string | null | undefined): string {
    return str?.trim() || ''
  }
  
  protected parseNumber(value: any): number | undefined {
    const num = parseInt(value?.toString() || '')
    return isNaN(num) ? undefined : num
  }
}