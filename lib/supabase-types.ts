/**
 * Supabase Database Types
 * 
 * Type definitions for all database tables
 * Generated from the PostgreSQL schema
 */

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
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          password: string | null
          role: 'admin' | 'team_lead' | 'agent'
          team_name: string | null
          contact_number: string | null
          employee_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          password?: string | null
          role: 'admin' | 'team_lead' | 'agent'
          team_name?: string | null
          contact_number?: string | null
          employee_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          password?: string | null
          role?: 'admin' | 'team_lead' | 'agent'
          team_name?: string | null
          contact_number?: string | null
          employee_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      master_data: {
        Row: {
          id: string
          brand_name: string
          brand_email_id: string | null
          kam_name: string
          brand_state: string
          zone: string
          kam_name_secondary: string | null
          kam_email_id: string
          outlet_counts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_name: string
          brand_email_id?: string | null
          kam_name: string
          brand_state: string
          zone: string
          kam_name_secondary?: string | null
          kam_email_id: string
          outlet_counts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_name?: string
          brand_email_id?: string | null
          kam_name?: string
          brand_state?: string
          zone?: string
          kam_name_secondary?: string | null
          kam_email_id?: string
          outlet_counts?: number
          created_at?: string
          updated_at?: string
        }
      }
      churn_records: {
        Row: {
          id: string
          date: string
          rid: string
          restaurant_name: string
          brand_name: string | null
          owner_email: string
          kam: string
          sync_days: string
          zone: string
          controlled_status: string
          churn_reason: string | null
          remarks: string | null
          mail_sent_confirmation: boolean | null
          date_time_filled: string | null
          uploaded_by: string | null
          uploaded_at: string | null
          follow_up_status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | null
          current_call: number | null
          is_follow_up_active: boolean | null
          mail_sent: boolean | null
          next_reminder_time: string | null
          follow_up_completed_at: string | null
          call_attempts: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          rid: string
          restaurant_name: string
          brand_name?: string | null
          owner_email: string
          kam: string
          sync_days: string
          zone: string
          controlled_status: string
          churn_reason?: string | null
          remarks?: string | null
          mail_sent_confirmation?: boolean | null
          date_time_filled?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          follow_up_status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | null
          current_call?: number | null
          is_follow_up_active?: boolean | null
          mail_sent?: boolean | null
          next_reminder_time?: string | null
          follow_up_completed_at?: string | null
          call_attempts?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          rid?: string
          restaurant_name?: string
          brand_name?: string | null
          owner_email?: string
          kam?: string
          sync_days?: string
          zone?: string
          controlled_status?: string
          churn_reason?: string | null
          remarks?: string | null
          mail_sent_confirmation?: boolean | null
          date_time_filled?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          follow_up_status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | null
          current_call?: number | null
          is_follow_up_active?: boolean | null
          mail_sent?: boolean | null
          next_reminder_time?: string | null
          follow_up_completed_at?: string | null
          call_attempts?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          visit_id: string
          brand_id: string
          brand_name: string
          agent_id: string
          agent_name: string
          team_lead_id: string | null
          team_name: string | null
          scheduled_date: string
          visit_date: string | null
          visit_status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending'
          mom_shared: 'Yes' | 'No' | 'Pending' | null
          mom_shared_date: string | null
          approval_status: 'Approved' | 'Rejected' | 'Pending' | null
          approved_by: string | null
          approved_at: string | null
          rejection_remarks: string | null
          rejected_by: string | null
          rejected_at: string | null
          resubmission_count: number | null
          resubmitted_at: string | null
          visit_year: string
          purpose: string | null
          outcome: string | null
          next_steps: string | null
          duration_minutes: string | null
          attendees: string | null
          notes: string | null
          zone: string | null
          is_backdated: boolean | null
          backdate_reason: string | null
          backdated_by: string | null
          backdated_at: string | null
          original_scheduled_date: string | null
          reschedule_reason: string | null
          rescheduled_by: string | null
          rescheduled_at: string | null
          reschedule_count: number | null
          last_rescheduled_by: string | null
          last_rescheduled_at: string | null
          reschedule_history: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          brand_id: string
          brand_name: string
          agent_id: string
          agent_name: string
          team_lead_id?: string | null
          team_name?: string | null
          scheduled_date: string
          visit_date?: string | null
          visit_status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending'
          mom_shared?: 'Yes' | 'No' | 'Pending' | null
          mom_shared_date?: string | null
          approval_status?: 'Approved' | 'Rejected' | 'Pending' | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_remarks?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          resubmission_count?: number | null
          resubmitted_at?: string | null
          visit_year: string
          purpose?: string | null
          outcome?: string | null
          next_steps?: string | null
          duration_minutes?: string | null
          attendees?: string | null
          notes?: string | null
          zone?: string | null
          is_backdated?: boolean | null
          backdate_reason?: string | null
          backdated_by?: string | null
          backdated_at?: string | null
          original_scheduled_date?: string | null
          reschedule_reason?: string | null
          rescheduled_by?: string | null
          rescheduled_at?: string | null
          reschedule_count?: number | null
          last_rescheduled_by?: string | null
          last_rescheduled_at?: string | null
          reschedule_history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visit_id?: string
          brand_id?: string
          brand_name?: string
          agent_id?: string
          agent_name?: string
          team_lead_id?: string | null
          team_name?: string | null
          scheduled_date?: string
          visit_date?: string | null
          visit_status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending'
          mom_shared?: 'Yes' | 'No' | 'Pending' | null
          mom_shared_date?: string | null
          approval_status?: 'Approved' | 'Rejected' | 'Pending' | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_remarks?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          resubmission_count?: number | null
          resubmitted_at?: string | null
          visit_year?: string
          purpose?: string | null
          outcome?: string | null
          next_steps?: string | null
          duration_minutes?: string | null
          attendees?: string | null
          notes?: string | null
          zone?: string | null
          is_backdated?: boolean | null
          backdate_reason?: string | null
          backdated_by?: string | null
          backdated_at?: string | null
          original_scheduled_date?: string | null
          reschedule_reason?: string | null
          rescheduled_by?: string | null
          rescheduled_at?: string | null
          reschedule_count?: number | null
          last_rescheduled_by?: string | null
          last_rescheduled_at?: string | null
          reschedule_history?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      demos: {
        Row: {
          id: string
          demo_id: string
          brand_name: string
          brand_id: string
          product_name: string
          agent_id: string
          agent_name: string
          team_name: string | null
          zone: string | null
          is_applicable: boolean | null
          non_applicable_reason: string | null
          step1_completed_at: string | null
          usage_status: 'Already Using' | 'Demo Pending' | null
          step2_completed_at: string | null
          demo_scheduled_date: string | null
          demo_scheduled_time: string | null
          demo_rescheduled_count: number | null
          demo_scheduling_history: Json | null
          demo_completed: boolean | null
          demo_completed_date: string | null
          demo_conducted_by: 'Agent' | 'RM' | 'MP Training' | 'Product Team' | null
          demo_completion_notes: string | null
          conversion_status: 'Converted' | 'Not Converted' | null
          non_conversion_reason: string | null
          conversion_decided_at: string | null
          current_status: string
          workflow_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          demo_id: string
          brand_name: string
          brand_id: string
          product_name: string
          agent_id: string
          agent_name: string
          team_name?: string | null
          zone?: string | null
          is_applicable?: boolean | null
          non_applicable_reason?: string | null
          step1_completed_at?: string | null
          usage_status?: 'Already Using' | 'Demo Pending' | null
          step2_completed_at?: string | null
          demo_scheduled_date?: string | null
          demo_scheduled_time?: string | null
          demo_rescheduled_count?: number | null
          demo_scheduling_history?: Json | null
          demo_completed?: boolean | null
          demo_completed_date?: string | null
          demo_conducted_by?: 'Agent' | 'RM' | 'MP Training' | 'Product Team' | null
          demo_completion_notes?: string | null
          conversion_status?: 'Converted' | 'Not Converted' | null
          non_conversion_reason?: string | null
          conversion_decided_at?: string | null
          current_status: string
          workflow_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          demo_id?: string
          brand_name?: string
          brand_id?: string
          product_name?: string
          agent_id?: string
          agent_name?: string
          team_name?: string | null
          zone?: string | null
          is_applicable?: boolean | null
          non_applicable_reason?: string | null
          step1_completed_at?: string | null
          usage_status?: 'Already Using' | 'Demo Pending' | null
          step2_completed_at?: string | null
          demo_scheduled_date?: string | null
          demo_scheduled_time?: string | null
          demo_rescheduled_count?: number | null
          demo_scheduling_history?: Json | null
          demo_completed?: boolean | null
          demo_completed_date?: string | null
          demo_conducted_by?: 'Agent' | 'RM' | 'MP Training' | 'Product Team' | null
          demo_completion_notes?: string | null
          conversion_status?: 'Converted' | 'Not Converted' | null
          non_conversion_reason?: string | null
          conversion_decided_at?: string | null
          current_status?: string
          workflow_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      health_checks: {
        Row: {
          id: string
          check_id: string
          brand_name: string
          brand_id: string | null
          kam_name: string
          kam_email: string
          zone: string
          team_name: string | null
          health_status: 'Green' | 'Amber' | 'Orange' | 'Red' | 'Not Connected' | 'Dead'
          brand_nature: 'Active' | 'Hyper Active' | 'Inactive'
          remarks: string | null
          assessment_month: string
          assessment_date: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          check_id: string
          brand_name: string
          brand_id?: string | null
          kam_name: string
          kam_email: string
          zone: string
          team_name?: string | null
          health_status: 'Green' | 'Amber' | 'Orange' | 'Red' | 'Not Connected' | 'Dead'
          brand_nature: 'Active' | 'Hyper Active' | 'Inactive'
          remarks?: string | null
          assessment_month: string
          assessment_date: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          check_id?: string
          brand_name?: string
          brand_id?: string | null
          kam_name?: string
          kam_email?: string
          zone?: string
          team_name?: string | null
          health_status?: 'Green' | 'Amber' | 'Orange' | 'Red' | 'Not Connected' | 'Dead'
          brand_nature?: 'Active' | 'Hyper Active' | 'Inactive'
          remarks?: string | null
          assessment_month?: string
          assessment_date?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      mom: {
        Row: {
          id: string
          ticket_id: string
          title: string
          description: string
          status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          category: 'Technical' | 'Billing' | 'General' | 'Feature Request' | null
          created_by: string
          assigned_to: string | null
          team: string | null
          brand_name: string | null
          customer_name: string | null
          resolution: string | null
          resolved_at: string | null
          due_date: string | null
          tags: string[] | null
          visit_id: string | null
          outcome: string | null
          next_steps: string | null
          notes: string | null
          is_resubmission: boolean | null
          resubmission_count: number | null
          resubmission_notes: string | null
          open_points: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          title: string
          description: string
          status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          category?: 'Technical' | 'Billing' | 'General' | 'Feature Request' | null
          created_by: string
          assigned_to?: string | null
          team?: string | null
          brand_name?: string | null
          customer_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          due_date?: string | null
          tags?: string[] | null
          visit_id?: string | null
          outcome?: string | null
          next_steps?: string | null
          notes?: string | null
          is_resubmission?: boolean | null
          resubmission_count?: number | null
          resubmission_notes?: string | null
          open_points?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          title?: string
          description?: string
          status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          category?: 'Technical' | 'Billing' | 'General' | 'Feature Request' | null
          created_by?: string
          assigned_to?: string | null
          team?: string | null
          brand_name?: string | null
          customer_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          due_date?: string | null
          tags?: string[] | null
          visit_id?: string | null
          outcome?: string | null
          next_steps?: string | null
          notes?: string | null
          is_resubmission?: boolean | null
          resubmission_count?: number | null
          resubmission_notes?: string | null
          open_points?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          email: string
          email_notifications: boolean
          sms_notifications: boolean
          reminder_frequency: 'immediate' | 'hourly' | 'daily'
          notification_types: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          email_notifications?: boolean
          sms_notifications?: boolean
          reminder_frequency: 'immediate' | 'hourly' | 'daily'
          notification_types: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          email_notifications?: boolean
          sms_notifications?: boolean
          reminder_frequency?: 'immediate' | 'hourly' | 'daily'
          notification_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      notification_log: {
        Row: {
          id: string
          email: string
          notification_type: string
          record_count: number
          content: string
          sent_at: string
          status: 'sent' | 'failed' | 'pending'
        }
        Insert: {
          id?: string
          email: string
          notification_type: string
          record_count?: number
          content: string
          sent_at?: string
          status: 'sent' | 'failed' | 'pending'
        }
        Update: {
          id?: string
          email?: string
          notification_type?: string
          record_count?: number
          content?: string
          sent_at?: string
          status?: 'sent' | 'failed' | 'pending'
        }
      }
    }
  }
}
