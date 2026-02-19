import { z } from 'zod';

// Churn Record Schema
export const ChurnRecordSchema = z.object({
  _id: z.string().optional(),
  date: z.string(),
  rid: z.string(),
  restaurant_name: z.string(),
  brand_name: z.string().optional().default(''),
  owner_email: z.string().email(),
  kam: z.string(),
  sync_days: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  controlled_status: z.string().optional().default('Churned'),
  churn_reason: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
  mail_sent_confirmation: z.boolean().optional().default(false),
  date_time_filled: z.string().optional().default(''),
  uploaded_by: z.string().optional(),
  uploaded_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Call attempt tracking
  call_attempts: z.array(z.object({
    call_number: z.number(),
    call_response: z.string(),
    churn_reason: z.string(),
    notes: z.string().optional(),
    timestamp: z.string(),
  })).optional().default([]),
  current_call: z.number().optional().default(0),
  follow_up_status: z.string().optional().default(''),
  is_follow_up_active: z.boolean().optional().default(false),
  next_reminder_time: z.string().optional().default(''),
  follow_up_completed_at: z.string().optional().default(''),
  mail_sent: z.boolean().optional().default(false),
});

// CSV Upload Schema
export const ChurnCSVRowSchema = z.object({
  Date: z.string()
    .min(1, 'Date is required')
    .regex(/^\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}$/, 'Date must be in DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY format (e.g., 30-01-2026, 30/01/2026, or 30.01.2026)'),
  RID: z.union([z.string(), z.number()]).transform(val => String(val)), // Accept both string and number
  'Restaurant Name': z.string().min(1, 'Restaurant Name is required'),
  'Brand Name': z.string().min(1, 'Brand Name is required'),
  'Owner Email ID': z.string().email('Valid email is required'),
  KAM: z.string().min(1, 'KAM is required'),
});

// Query Schemas
export const ChurnQuerySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(100),
  search: z.string().optional(),
});

export const UpdateChurnReasonSchema = z.object({
  rid: z.string(),
  churn_reason: z.string(),
  remarks: z.string().optional(),
});

export const UpdateFollowUpTimingSchema = z.object({
  rid: z.string(),
  next_reminder_time: z.string(),
  follow_up_status: z.string(),
});

// Type exports
export type ChurnRecord = z.infer<typeof ChurnRecordSchema>;
export type ChurnCSVRow = z.infer<typeof ChurnCSVRowSchema>;
export type ChurnQuery = z.infer<typeof ChurnQuerySchema>;
export type UpdateChurnReason = z.infer<typeof UpdateChurnReasonSchema>;
export type UpdateFollowUpTiming = z.infer<typeof UpdateFollowUpTimingSchema>;

// Response types
export interface ChurnDataResponse {
  success: boolean;
  data: ChurnRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  user_info: {
    role: string;
    team?: string;
    email: string;
  };
  missing_churn_reasons: number;
  categorization: {
    newCount: number;
    overdue: number;
    followUps: number;
    completed: number;
  };
}

export interface ChurnStatisticsResponse {
  success: boolean;
  statistics: {
    total_records: number;
    completed_records: number;
    missing_churn_reasons: number;
    completion_percentage: number;
    zone_breakdown: Record<string, {
      total: number;
      completed: number;
      missing: number;
    }>;
    user_role: string;
    user_team?: string;
  };
}

export interface ChurnUploadResponse {
  success: boolean;
  message: string;
  summary: {
    total_rows_in_file: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows_in_file: number;
    existing_records_skipped: number;
    new_records_imported: number;
    import_failures: number;
  };
  details: {
    uploaded_by: string;
    uploaded_at: string;
    filename: string;
    existing_rids: string[];
    import_errors: any[];
  };
}