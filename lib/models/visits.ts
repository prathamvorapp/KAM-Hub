import { z } from 'zod';

// Base record schema
export const BaseRecordSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().optional(),
  team: z.string().optional()
});

// Visit record schema
export const VisitRecordSchema = BaseRecordSchema.extend({
  // Core visit information
  visit_id: z.string(),
  brand_id: z.string(),
  brand_name: z.string(),
  agent_id: z.string(),
  agent_name: z.string(),
  team_lead_id: z.string().optional(),
  team_name: z.string().optional(),
  
  // Visit scheduling and details
  scheduled_date: z.string(),
  visit_date: z.string().optional(),
  visit_type: z.string().default('On-site'),
  
  // Visit status workflow
  visit_status: z.string().default('Scheduled'),
  
  // MoM (Minutes of Meeting) workflow
  mom_shared: z.string().optional(),
  mom_content: z.string().optional(),
  mom_attachment: z.string().optional(),
  mom_shared_date: z.string().optional(),
  
  // Approval workflow
  approval_status: z.string().default('Not Required'),
  approved_by: z.string().optional(),
  approval_date: z.string().optional(),
  approval_notes: z.string().optional(),
  
  // Visit details
  purpose: z.string().optional(),
  outcome: z.string().optional(),
  next_steps: z.string().optional(),
  duration_minutes: z.string().optional(),
  attendees: z.string().optional(),
  notes: z.string().optional(),
  zone: z.string().optional(),
  
  // Business rules tracking
  visit_year: z.string(),
  visit_count_for_agent: z.number().optional()
});

// Demo record schema
export const DemoRecordSchema = BaseRecordSchema.extend({
  demo_id: z.string(),
  customer_name: z.string(),
  demo_date: z.string(),
  product_demo: z.string(),
  attendees: z.string().optional(),
  outcome: z.string().optional(),
  follow_up_date: z.string().optional(),
  status: z.string(),
  demo_done_count: z.string().optional(),
  demo_pending_count: z.string().optional(),
  last_connected: z.string().optional(),
  brand_type: z.string().optional(),
  zone: z.string().optional(),
  notes: z.string().optional()
});

// Health check record schema
export const HealthCheckRecordSchema = BaseRecordSchema.extend({
  check_id: z.string(),
  kam_name: z.string(),
  brand_name: z.string(),
  zone: z.string(),
  health_status: z.string(),
  nature_of_visit: z.string().optional(),
  remarks: z.string().optional(),
  dead_not_connected: z.string().optional(),
  customer_name: z.string().optional(),
  check_date: z.string(),
  health_score: z.number().optional(),
  issues_identified: z.string().optional(),
  action_items: z.string().optional(),
  next_check_date: z.string().optional()
});

// MOM/Ticket record schema
export const MOMRecordSchema = BaseRecordSchema.extend({
  ticket_id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  category: z.string().optional(),
  assigned_to: z.string().optional(),
  brand_name: z.string().optional(),
  customer_name: z.string().optional(),
  resolution: z.string().optional(),
  resolved_at: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.string().optional()
});

// Query schemas
export const ModuleQuerySchema = z.object({
  team: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.number().max(1000).default(100),
  offset: z.number().min(0).default(0),
  search: z.string().optional()
});

export const BrandsQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional()
});

// Statistics response schemas
export const VisitStatisticsSchema = z.object({
  total_brands: z.number().default(0),
  total_visits_done: z.number().default(0),
  total_visits_pending: z.number().default(0),
  total_scheduled_visits: z.number().default(0),
  total_cancelled_visits: z.number().default(0),
  last_month_visits: z.number().default(0),
  current_month_scheduled: z.number().default(0),
  current_month_completed: z.number().default(0),
  current_month_total: z.number().default(0),
  mom_pending: z.number().default(0),
  monthly_target: z.number().default(10),
  current_month_progress: z.number().default(0),
  overall_progress: z.number().default(0)
});

export const AgentStatisticsSchema = z.object({
  agent_name: z.string(),
  agent_email: z.string(),
  team_name: z.string(),
  role: z.string().optional(),
  brands_assigned: z.number().default(0),
  visits_completed: z.number().default(0),
  visits_pending: z.number().default(0),
  visits_scheduled: z.number().default(0),
  visits_cancelled: z.number().default(0),
  mom_pending: z.number().default(0),
  current_month_completed: z.number().default(0),
  current_month_scheduled: z.number().default(0),
  current_month_total: z.number().default(0),
  monthly_target: z.number().default(10),
  current_month_progress: z.number().default(0),
  overall_progress: z.number().default(0),
  last_month_visits: z.number().default(0),
  performance_rating: z.string().default('No Data'),
  completion_rate: z.number().default(0),
  error: z.boolean().optional()
});

// Type exports
export type BaseRecord = z.infer<typeof BaseRecordSchema>;
export type VisitRecord = z.infer<typeof VisitRecordSchema>;
export type DemoRecord = z.infer<typeof DemoRecordSchema>;
export type HealthCheckRecord = z.infer<typeof HealthCheckRecordSchema>;
export type MOMRecord = z.infer<typeof MOMRecordSchema>;
export type ModuleQuery = z.infer<typeof ModuleQuerySchema>;
export type BrandsQuery = z.infer<typeof BrandsQuerySchema>;
export type VisitStatistics = z.infer<typeof VisitStatisticsSchema>;
export type AgentStatistics = z.infer<typeof AgentStatisticsSchema>;

// Module mapping
export const MODULE_SCHEMAS = {
  visits: VisitRecordSchema,
  demos: DemoRecordSchema,
  'health-checks': HealthCheckRecordSchema,
  MOM: MOMRecordSchema
} as const;

export type ModuleName = keyof typeof MODULE_SCHEMAS;

// Response types
export interface VisitDataResponse {
  success: boolean;
  data: VisitRecord[];
  total: number;
  message: string;
  filters_applied?: Record<string, any>;
}

export interface VisitStatisticsResponse {
  success: boolean;
  statistics: VisitStatistics;
  message: string;
}

export interface AdminStatisticsResponse {
  success: boolean;
  agent_statistics: AgentStatistics[];
  agent_wise_breakdown: AgentStatistics[];
  organization_summary: {
    total_agents: number;
    total_brands: number;
    total_visits_done: number;
    total_visits_pending: number;
    total_scheduled_visits: number;
    total_cancelled_visits: number;
    current_month_total: number;
    monthly_target: number;
    organization_progress: number;
  };
}

export interface TeamStatisticsResponse {
  success: boolean;
  data: {
    team_statistics: AgentStatistics[];
    team_wise_breakdown: AgentStatistics[];
    team_summary: {
      total_brands: number;
      total_visits_done: number;
      total_visits_pending: number;
      total_scheduled_visits: number;
      total_cancelled_visits: number;
      current_month_total: number;
      monthly_target: number;
      team_progress: number;
    };
    team_name: string;
    team_lead: string;
  };
  team_statistics: AgentStatistics[];
  team_wise_breakdown: AgentStatistics[];
  team_summary: {
    total_brands: number;
    total_visits_done: number;
    total_visits_pending: number;
    total_scheduled_visits: number;
    total_cancelled_visits: number;
    current_month_total: number;
    monthly_target: number;
    team_progress: number;
  };
  team_name: string;
  team_lead: string;
}

export interface BrandsResponse {
  success: boolean;
  data: any[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  message: string;
}