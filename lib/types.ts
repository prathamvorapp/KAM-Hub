// User types for the application
export type UserRole = 'admin' | 'team_lead' | 'agent'

export interface UserProfile {
  user_id: string
  email: string
  user_name?: string
  full_name?: string
  role: UserRole
  team?: string
  team_name?: string
  permissions: string[]
  contact_number?: string
  employee_code?: string
  is_active: boolean
}

// Legacy interface for backward compatibility
export interface UserProfileFromDB {
  user_id: string
  email: string
  user_name: string
  role: string
  team: string
  emp_id?: string
  mobile_number?: string
  is_active: boolean
}