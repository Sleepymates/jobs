export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: number
          title: string
          description: string
          requirements: string | null
          custom_questions: string[] | null
          tags: string[] | null
          deadline: string | null
          email: string
          passcode: string
          job_id: string
          company_name: string
          logo_url: string | null
          notify_threshold: number | null
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          description: string
          requirements?: string | null
          custom_questions?: string[] | null
          tags?: string[] | null
          deadline?: string | null
          email: string
          passcode: string
          job_id: string
          company_name: string
          logo_url?: string | null
          notify_threshold?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string
          requirements?: string | null
          custom_questions?: string[] | null
          tags?: string[] | null
          deadline?: string | null
          email?: string
          passcode?: string
          job_id?: string
          company_name?: string
          logo_url?: string | null
          notify_threshold?: number | null
          created_at?: string
        }
      }
      applicants: {
        Row: {
          id: number
          job_id: string
          name: string
          age: number | null
          location: string | null
          education: string | null
          cv_url: string
          motivation_text: string | null
          followup_questions: string[] | null
          followup_answers: string[] | null
          ai_score: number | null
          ai_summary: string | null
          created_at: string
        }
        Insert: {
          id?: number
          job_id: string
          name: string
          age?: number | null
          location?: string | null
          education?: string | null
          cv_url: string
          motivation_text?: string | null
          followup_questions?: string[] | null
          followup_answers?: string[] | null
          ai_score?: number | null
          ai_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          job_id?: string
          name?: string
          age?: number | null
          location?: string | null
          education?: string | null
          cv_url?: string
          motivation_text?: string | null
          followup_questions?: string[] | null
          followup_answers?: string[] | null
          ai_score?: number | null
          ai_summary?: string | null
          created_at?: string
        }
      }
      analytics: {
        Row: {
          id: number
          job_id: string
          views: number
          applicant_count: number
        }
        Insert: {
          id?: number
          job_id: string
          views: number
          applicant_count: number
        }
        Update: {
          id?: number
          job_id?: string
          views?: number
          applicant_count?: number
        }
      }
    }
  }
}