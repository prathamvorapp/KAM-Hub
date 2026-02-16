import { z } from 'zod';

export enum UserRole {
  ADMIN = 'Admin',
  TEAM_LEAD = 'Team Lead',
  AGENT = 'Agent'
}

export const UserRoleSchema = z.nativeEnum(UserRole);

export const UserProfileSchema = z.object({
  email: z.string().email(),
  full_name: z.string(),
  role: UserRoleSchema,
  team_name: z.string().optional(),
  contact_number: z.string().optional(),
  employee_code: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  is_active: z.boolean().default(true)
});

export const RoleMappingSchema = z.object({
  email: z.string().email(),
  role: UserRoleSchema,
  team_name: z.string().optional(),
  is_active: z.boolean().default(true)
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type RoleMapping = z.infer<typeof RoleMappingSchema>;

// Legacy interface for backward compatibility
export interface UserProfileFromDB {
  user_id: string;
  email: string;
  user_name: string;
  role: string;
  team: string;
  emp_id?: string;
  mobile_number?: string;
  is_active: boolean;
}

// Authentication response types
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface TokenVerificationResponse {
  valid: boolean;
  user?: {
    email: string;
    role: string;
    team_name?: string;
  };
  error?: string;
}