export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            foreignKeyName: "completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "v_module_metrics"
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
          {
            foreignKeyName: "completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "content_imports_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "content_imports_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          ndis_compliant: boolean
          organization_id: string | null
          owner_type: string | null
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
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          ndis_compliant?: boolean
          organization_id?: string | null
          owner_type?: string | null
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
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          ndis_compliant?: boolean
          organization_id?: string | null
          owner_type?: string | null
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
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "forums_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "forums_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          max_attempts: number
          order_index: number
          organization_id: string | null
          pass_threshold_percentage: number
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number
          order_index: number
          organization_id?: string | null
          pass_threshold_percentage?: number
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number
          order_index?: number
          organization_id?: string | null
          pass_threshold_percentage?: number
          time_limit_minutes?: number | null
          title?: string
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "v_module_metrics"
            referencedColumns: ["module_id"]
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
            foreignKeyName: "user_course_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
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
      mv_course_metrics: {
        Row: {
          avg_score: number | null
          avg_time_minutes: number | null
          completed: number | null
          completed_last_30d: number | null
          completion_rate: number | null
          course_id: string | null
          in_progress: number | null
          learners: number | null
          median_score: number | null
          started_last_30d: number | null
        }
        Relationships: []
      }
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["course_id"]
          },
        ]
      }
      mv_retention_metrics: {
        Row: {
          cohort_week: string | null
          retained_30d: number | null
          retained_60d: number | null
          retained_90d: number | null
          users_started: number | null
        }
        Relationships: []
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
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
          {
            foreignKeyName: "user_course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mv_user_progress_analytics: {
        Row: {
          avg_score: number | null
          completed_courses: number | null
          department: string | null
          email: string | null
          enrolled_courses: number | null
          first_completed_at: string | null
          first_name: string | null
          last_activity_at: string | null
          last_completion_date: string | null
          last_name: string | null
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_time_minutes: number | null
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
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_learning_patterns: {
        Row: {
          attempts: number | null
          avg_time_minutes: number | null
          bucket: number | null
          bucket_type: string | null
          completions: number | null
        }
        Relationships: []
      }
      v_module_metrics: {
        Row: {
          attempts: number | null
          avg_score: number | null
          avg_time_minutes: number | null
          course_id: string | null
          dropoff_rate: number | null
          module_id: string | null
          pass_rate: number | null
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
            referencedRelation: "mv_course_metrics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "mv_course_performance_analytics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_skills_gap"
            referencedColumns: ["course_id"]
          },
        ]
      }
      v_skills_gap: {
        Row: {
          course_id: string | null
          due_date: string | null
          mandatory: boolean | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      change_user_organization: {
        Args: { target_user_id: string; new_org_id: string }
        Returns: boolean
      }
      create_org: {
        Args: { p_name: string; p_slug: string; p_contact_email: string }
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
      get_announcement_stats: {
        Args: { announcement_id_param: string }
        Returns: {
          total_readers: number
          total_eligible: number
          read_percentage: number
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
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      is_manager_of: {
        Args: { manager_uid: string; employee_uid: string }
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
        Returns: unknown[]
      }
      rpc_course_metrics: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          course_id: string
          course_title: string
          category: string
          difficulty: string
          enrolled_users: number
          completed_users: number
          completion_rate: number
          avg_score: number
          avg_time_minutes: number
          total_attempts: number
          passed_attempts: number
        }[]
      }
      rpc_learning_patterns: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          bucket_type: string
          bucket: string
          completions: number
          avg_score: number
          avg_time_minutes: number
        }[]
      }
      rpc_module_metrics: {
        Args: {
          course_id_filter?: string
          date_from?: string
          date_to?: string
        }
        Returns: {
          module_id: string
          course_id: string
          module_title: string
          course_title: string
          content_type: string
          order_index: number
          attempted_users: number
          completed_users: number
          completion_rate: number
          avg_score: number
          avg_time_minutes: number
          total_attempts: number
          avg_attempts_per_user: number
        }[]
      }
      rpc_skills_gap: {
        Args: { department_filter?: string; role_filter?: string }
        Returns: {
          department: string
          role: string
          total_users: number
          avg_completion_rate: number
          skills_gaps: string[]
          recommended_courses: string[]
        }[]
      }
    }
    Enums: {
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
      difficulty_level: ["beginner", "intermediate", "advanced"],
      user_role: ["admin", "manager", "worker"],
    },
  },
} as const
