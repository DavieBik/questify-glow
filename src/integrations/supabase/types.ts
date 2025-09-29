export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analytics_saved_reports: {
        Row: {
          columns: string[] | null
          created_at: string
          dataset: string
          description: string | null
          filters: Json | null
          id: string
          name: string
          owner_id: string
          shared: boolean | null
          updated_at: string
        }
        Insert: {
          columns?: string[] | null
          created_at?: string
          dataset: string
          description?: string | null
          filters?: Json | null
          id?: string
          name: string
          owner_id: string
          shared?: boolean | null
          updated_at?: string
        }
        Update: {
          columns?: string[] | null
          created_at?: string
          dataset?: string
          description?: string | null
          filters?: Json | null
          id?: string
          name?: string
          owner_id?: string
          shared?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          organization_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          organization_id?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          organization_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          default_org_id: string
          id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_org_id: string
          id?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_org_id?: string
          id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_default_org_id_fkey"
            columns: ["default_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          course_id: string
          created_at: string
          enrollment_id: string
          id: string
          organization_id: string
          request_type: string
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          organization_id?: string
          request_type?: string
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          organization_id?: string
          request_type?: string
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          criteria_sql: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria_sql: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria_sql?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_jobs: {
        Row: {
          created_at: string | null
          created_by: string
          error_message: string | null
          id: string
          job_type: string
          organization_id: string
          payload: Json
          processed_count: number | null
          status: string
          total_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          error_message?: string | null
          id?: string
          job_type: string
          organization_id: string
          payload: Json
          processed_count?: number | null
          status?: string
          total_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          id?: string
          job_type?: string
          organization_id?: string
          payload?: Json
          processed_count?: number | null
          status?: string
          total_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          completion_time_minutes: number | null
          course_id: string
          created_at: string
          expiry_date: string | null
          final_score_percentage: number
          id: string
          is_valid: boolean
          issue_date: string
          issued_by: string | null
          pdf_url: string | null
          qr_code_data: string | null
          user_id: string
          verification_url: string | null
        }
        Insert: {
          certificate_number: string
          completion_time_minutes?: number | null
          course_id: string
          created_at?: string
          expiry_date?: string | null
          final_score_percentage: number
          id?: string
          is_valid?: boolean
          issue_date: string
          issued_by?: string | null
          pdf_url?: string | null
          qr_code_data?: string | null
          user_id: string
          verification_url?: string | null
        }
        Update: {
          certificate_number?: string
          completion_time_minutes?: number | null
          course_id?: string
          created_at?: string
          expiry_date?: string | null
          final_score_percentage?: number
          id?: string
          is_valid?: boolean
          issue_date?: string
          issued_by?: string | null
          pdf_url?: string | null
          qr_code_data?: string | null
          user_id?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      completions: {
        Row: {
          attempt_number: number
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          module_id: string
          points: number | null
          points_earned: number | null
          points_possible: number | null
          score_percentage: number | null
          started_at: string
          status: string
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          module_id: string
          points?: number | null
          points_earned?: number | null
          points_possible?: number | null
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          module_id?: string
          points?: number | null
          points_earned?: number | null
          points_possible?: number | null
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mv_module_analytics"
            referencedColumns: ["module_id"]
          },
          {
            foreignKeyName: "completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_imports: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          import_type: string
          metadata: Json | null
          organization_id: string | null
          source_course_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          import_type: string
          metadata?: Json | null
          organization_id?: string | null
          source_course_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          import_type?: string
          metadata?: Json | null
          organization_id?: string | null
          source_course_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_imports_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_imports_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          prerequisite_course_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          prerequisite_course_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          prerequisite_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number | null
          estimated_duration_minutes: number | null
          external_id: string | null
          format: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          ndis_compliant: boolean
          organization_id: string | null
          owner_type: string | null
          price: number | null
          requires_approval: boolean | null
          scorm_package_url: string | null
          short_description: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          visibility: string | null
          visibility_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          estimated_duration_minutes?: number | null
          external_id?: string | null
          format?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          ndis_compliant?: boolean
          organization_id?: string | null
          owner_type?: string | null
          price?: number | null
          requires_approval?: boolean | null
          scorm_package_url?: string | null
          short_description?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          visibility?: string | null
          visibility_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number | null
          estimated_duration_minutes?: number | null
          external_id?: string | null
          format?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          ndis_compliant?: boolean
          organization_id?: string | null
          owner_type?: string | null
          price?: number | null
          requires_approval?: boolean | null
          scorm_package_url?: string | null
          short_description?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          visibility?: string | null
          visibility_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          curriculum_id: string
          due_at: string | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["curriculum_assignment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          curriculum_id: string
          due_at?: string | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["curriculum_assignment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          curriculum_id?: string
          due_at?: string | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["curriculum_assignment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_assignments_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_items: {
        Row: {
          course_id: string
          created_at: string
          curriculum_id: string
          due_days_offset: number | null
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          curriculum_id: string
          due_days_offset?: number | null
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          curriculum_id?: string
          due_days_offset?: number | null
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "curriculum_items_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          path: unknown | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          path?: unknown | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          path?: unknown | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          due_at: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          due_at?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          due_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string
          forum_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          forum_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          forum_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organization_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forums_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forums_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "forums_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_job_errors: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          job_id: string | null
          message: string | null
          raw: Json | null
          row_number: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          message?: string | null
          raw?: Json | null
          row_number?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          message?: string | null
          raw?: Json | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_job_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_path: string | null
          id: string
          kind: string
          original_filename: string | null
          source: string | null
          status: string | null
          totals: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          kind: string
          original_filename?: string | null
          source?: string | null
          status?: string | null
          totals?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          original_filename?: string | null
          source?: string | null
          status?: string | null
          totals?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_mappings: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          required: boolean | null
          source_column: string | null
          target_column: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          required?: boolean | null
          source_column?: string | null
          target_column?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          required?: boolean | null
          source_column?: string | null
          target_column?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_mappings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited: boolean
          file_url: string | null
          id: string
          message_type: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited?: boolean
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited?: boolean
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          body: string | null
          captions_url: string | null
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          external_id: string | null
          id: string
          is_required: boolean
          max_attempts: number
          order_index: number
          organization_id: string | null
          pass_threshold_percentage: number
          poster_url: string | null
          provider: string | null
          provider_asset_id: string | null
          require_watch_pct: number | null
          status: string | null
          time_limit_minutes: number | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          captions_url?: string | null
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number
          order_index: number
          organization_id?: string | null
          pass_threshold_percentage?: number
          poster_url?: string | null
          provider?: string | null
          provider_asset_id?: string | null
          require_watch_pct?: number | null
          status?: string | null
          time_limit_minutes?: number | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          captions_url?: string | null
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number
          order_index?: number
          organization_id?: string | null
          pass_threshold_percentage?: number
          poster_url?: string | null
          provider?: string | null
          provider_asset_id?: string | null
          require_watch_pct?: number | null
          status?: string | null
          time_limit_minutes?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          notification_method: string
          notification_type: string
          organization_id: string
          sent_at: string
          status: string
          template_used: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          notification_method?: string
          notification_type: string
          organization_id?: string
          sent_at?: string
          status?: string
          template_used?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          notification_method?: string
          notification_type?: string
          organization_id?: string
          sent_at?: string
          status?: string
          template_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_branding: {
        Row: {
          banner_image_url: string | null
          created_at: string
          external_link_title: string | null
          external_link_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          external_link_title?: string | null
          external_link_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          external_link_title?: string | null
          external_link_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_users: number
          organization_id: string | null
          plan_name: string
          price_aud_cents: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_users?: number
          organization_id?: string | null
          plan_name?: string
          price_aud_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_users?: number
          organization_id?: string | null
          plan_name?: string
          price_aud_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_email: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_users: number | null
          name: string
          primary_color: string | null
          slug: string
          subscription_plan: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          name: string
          primary_color?: string | null
          slug: string
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          name?: string
          primary_color?: string | null
          slug?: string
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      peer_reviews: {
        Row: {
          feedback: string | null
          id: string
          rating: number | null
          review_criteria: Json | null
          reviewer_team_id: string
          reviewer_user_id: string
          submission_id: string
          submitted_at: string
        }
        Insert: {
          feedback?: string | null
          id?: string
          rating?: number | null
          review_criteria?: Json | null
          reviewer_team_id: string
          reviewer_user_id: string
          submission_id: string
          submitted_at?: string
        }
        Update: {
          feedback?: string | null
          id?: string
          rating?: number | null
          review_criteria?: Json | null
          reviewer_team_id?: string
          reviewer_user_id?: string
          submission_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_reviews_reviewer_team_id_fkey"
            columns: ["reviewer_team_id"]
            isOneToOne: false
            referencedRelation: "project_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "project_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          external_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_final: boolean
          link_url: string | null
          submission_type: string
          submitted_at: string
          submitted_by: string
          team_id: string
        }
        Insert: {
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_final?: boolean
          link_url?: string | null
          submission_type: string
          submitted_at?: string
          submitted_by: string
          team_id: string
        }
        Update: {
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_final?: boolean
          link_url?: string | null
          submission_type?: string
          submitted_at?: string
          submitted_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "project_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_full: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_full?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_full?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          allow_self_enrollment: boolean
          course_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          grading_rubric: Json | null
          id: string
          instructions: string | null
          is_active: boolean
          max_team_size: number
          min_team_size: number
          organization_id: string | null
          submission_format: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_self_enrollment?: boolean
          course_id: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          grading_rubric?: Json | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_team_size?: number
          min_team_size?: number
          organization_id?: string | null
          submission_format?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_self_enrollment?: boolean
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          grading_rubric?: Json | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_team_size?: number
          min_team_size?: number
          organization_id?: string | null
          submission_format?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answer_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          module_id: string
          order_index: number
          points: number
          question_text: string
          question_type: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          module_id: string
          order_index: number
          points?: number
          question_text: string
          question_type: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          module_id?: string
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mv_module_analytics"
            referencedColumns: ["module_id"]
          },
        ]
      }
      scorm_interactions: {
        Row: {
          created_at: string
          element: string
          id: string
          session_id: string
          ts: string
          value: string | null
        }
        Insert: {
          created_at?: string
          element: string
          id?: string
          session_id: string
          ts?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          element?: string
          id?: string
          session_id?: string
          ts?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scorm_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_packages: {
        Row: {
          created_at: string
          created_by: string
          entry_path: string | null
          id: string
          organization_id: string
          storage_path: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entry_path?: string | null
          id?: string
          organization_id?: string
          storage_path: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entry_path?: string | null
          id?: string
          organization_id?: string
          storage_path?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      scorm_sessions: {
        Row: {
          attempt: number
          created_at: string
          data: Json | null
          ended_at: string | null
          id: string
          organization_id: string | null
          package_id: string
          score: number | null
          started_at: string | null
          status: string
          total_time: unknown | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          data?: Json | null
          ended_at?: string | null
          id?: string
          organization_id?: string | null
          package_id: string
          score?: number | null
          started_at?: string | null
          status?: string
          total_time?: unknown | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          data?: Json | null
          ended_at?: string | null
          id?: string
          organization_id?: string | null
          package_id?: string
          score?: number | null
          started_at?: string | null
          status?: string
          total_time?: unknown | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_rsvps: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          join_url: string | null
          organization_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          join_url?: string | null
          organization_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          join_url?: string | null
          organization_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "project_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_enrollments: {
        Row: {
          course_id: string
          due_at: string | null
          due_date: string | null
          enrolled_by: string | null
          enrollment_date: string
          id: string
          progress_percentage: number
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          due_at?: string | null
          due_date?: string | null
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          progress_percentage?: number
          status?: string
          user_id: string
        }
        Update: {
          course_id?: string
          due_at?: string | null
          due_date?: string | null
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          progress_percentage?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          last_position_seconds: number | null
          module_id: string
          updated_at: string
          user_id: string
          watched_pct: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          last_position_seconds?: number | null
          module_id: string
          updated_at?: string
          user_id: string
          watched_pct?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          last_position_seconds?: number | null
          module_id?: string
          updated_at?: string
          user_id?: string
          watched_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mv_module_analytics"
            referencedColumns: ["module_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          employee_id: string | null
          first_name: string
          id: string
          is_active: boolean
          last_completion_date: string | null
          last_login: string | null
          last_name: string
          manager_id: string | null
          organization_id: string | null
          password_hash: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_completion_date?: string | null
          last_login?: string | null
          last_name: string
          manager_id?: string | null
          organization_id?: string | null
          password_hash: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_completion_date?: string | null
          last_login?: string | null
          last_name?: string
          manager_id?: string | null
          organization_id?: string | null
          password_hash?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_course_performance_analytics: {
        Row: {
          avg_score: number | null
          avg_time_minutes: number | null
          category: string | null
          completed_users: number | null
          completion_rate: number | null
          course_id: string | null
          course_title: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          enrolled_users: number | null
          estimated_duration_minutes: number | null
          is_mandatory: boolean | null
          passed_attempts: number | null
          total_attempts: number | null
        }
        Relationships: []
      }
      mv_module_analytics: {
        Row: {
          attempted_users: number | null
          avg_attempts_per_user: number | null
          avg_score: number | null
          avg_time_minutes: number | null
          completed_users: number | null
          completion_rate: number | null
          content_type: string | null
          course_id: string | null
          course_title: string | null
          max_attempts: number | null
          module_id: string | null
          module_title: string | null
          order_index: number | null
          pass_threshold_percentage: number | null
          total_attempts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
        ]
      }
      mv_user_course_progress: {
        Row: {
          attempts: number | null
          avg_score: number | null
          best_score: number | null
          course_id: string | null
          first_completed_at: string | null
          first_started_at: string | null
          last_activity_at: string | null
          modules_passed: number | null
          modules_total: number | null
          progress_pct: number | null
          time_spent_minutes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_user_progress_analytics: {
        Row: {
          avg_score: number | null
          completed_courses: number | null
          completions_last_30d: number | null
          department: string | null
          email: string | null
          enrolled_courses: number | null
          first_name: string | null
          last_completed_at: string | null
          last_completion_date: string | null
          last_name: string | null
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_learning_time_minutes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "mv_user_progress_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      assign_curriculum_to_user: {
        Args: {
          p_assigned_by: string
          p_curriculum_id: string
          p_user_id: string
        }
        Returns: string
      }
      change_user_organization: {
        Args: { new_org_id: string; target_user_id: string }
        Returns: boolean
      }
      create_approval_request: {
        Args: {
          p_course_id: string
          p_enrollment_id: string
          p_request_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_org: {
        Args: { p_contact_email: string; p_name: string; p_slug: string }
        Returns: {
          contact_email: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_users: number | null
          name: string
          primary_color: string | null
          slug: string
          subscription_plan: string | null
          updated_at: string | null
        }
      }
      enable_role_preview: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_announcement_stats: {
        Args: { announcement_id_param: string }
        Returns: {
          read_percentage: number
          total_eligible: number
          total_readers: number
        }[]
      }
      get_default_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_due_enrollments: {
        Args: { days_ahead?: number }
        Returns: {
          course_id: string
          course_title: string
          days_until_due: number
          due_at: string
          enrollment_id: string
          is_overdue: boolean
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_org_role: {
        Args:
          | { p_org: string; p_roles: string[]; p_user?: string }
          | { required_role: string }
        Returns: boolean
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_manager_of: {
        Args: { employee_uid: string; manager_uid: string }
        Returns: boolean
      }
      is_member_of: {
        Args: { p_org: string; p_user?: string }
        Returns: boolean
      }
      is_org_admin_or_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      lquery_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree2text: {
        Args: { "": unknown }
        Returns: string
      }
      ltxtq_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_send: {
        Args: { "": unknown }
        Returns: string
      }
      nlevel: {
        Args: { "": unknown }
        Returns: number
      }
      process_approval: {
        Args: { p_approval_id: string; p_notes?: string; p_status: string }
        Returns: boolean
      }
      refresh_all_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rpc_admin_team_user_progress: {
        Args: { date_from?: string; date_to?: string; manager_scope?: boolean }
        Returns: {
          average_score: number
          completed_courses: number
          completion_rate: number
          department: string
          engagement_score: number
          enrolled_courses: number
          last_activity: string
          role: Database["public"]["Enums"]["user_role"]
          total_hours: number
          user_id: string
          user_name: string
        }[]
      }
      rpc_approvals_queue: {
        Args: Record<PropertyKey, never> | { allow_preview?: boolean }
        Returns: {
          course_title: string
          id: string
          request_type: string
          requested_at: string
          reviewer_notes: string
          status: string
          user_email: string
          user_name: string
        }[]
      }
      rpc_bulk_assign: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rpc_course_metrics: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          avg_score: number
          avg_time_minutes: number
          category: string
          completed_users: number
          completion_rate: number
          course_id: string
          course_title: string
          difficulty: string
          enrolled_users: number
          passed_attempts: number
          total_attempts: number
        }[]
      }
      rpc_learning_patterns: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          avg_score: number
          avg_time_minutes: number
          bucket: string
          bucket_type: string
          completions: number
        }[]
      }
      rpc_manager_dashboard_metrics: {
        Args:
          | { allow_preview?: boolean; date_from?: string; date_to?: string }
          | { date_from?: string; date_to?: string }
        Returns: {
          active_learners_7d: number
          completion_rate_30d: number
          due_soon_enrollments: number
          overdue_enrollments: number
        }[]
      }
      rpc_module_metrics: {
        Args: {
          course_id_filter?: string
          date_from?: string
          date_to?: string
        }
        Returns: {
          attempted_users: number
          avg_attempts_per_user: number
          avg_score: number
          avg_time_minutes: number
          completed_users: number
          completion_rate: number
          content_type: string
          course_id: string
          course_title: string
          module_id: string
          module_title: string
          order_index: number
          total_attempts: number
        }[]
      }
      rpc_retention_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          cohort_week: string
          retained_30d: number
          retained_60d: number
          retained_90d: number
          retention_rate_30d: number
          retention_rate_60d: number
          retention_rate_90d: number
          users_started: number
        }[]
      }
      rpc_skills_gap: {
        Args: { department_filter?: string; role_filter?: string }
        Returns: {
          avg_completion_rate: number
          department: string
          recommended_courses: string[]
          role: string
          skills_gaps: string[]
          total_users: number
        }[]
      }
      rpc_team_compliance: {
        Args:
          | {
              allow_preview?: boolean
              date_from?: string
              date_to?: string
              department_filter?: string
            }
          | { date_from?: string; date_to?: string; department_filter?: string }
        Returns: {
          assigned_courses: number
          completed_courses: number
          completion_percentage: number
          department: string
          email: string
          last_activity: string
          overdue_courses: number
          required_courses: number
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
          user_name: string
        }[]
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
    }
    Enums: {
      curriculum_assignment_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "overdue"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      user_role: "admin" | "manager" | "worker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      curriculum_assignment_status: [
        "assigned",
        "in_progress",
        "completed",
        "overdue",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      user_role: ["admin", "manager", "worker"],
    },
  },
} as const
