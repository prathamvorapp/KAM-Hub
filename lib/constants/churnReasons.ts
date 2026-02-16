/**
 * Centralized Churn Reason Constants
 * Single source of truth for all churn-related categorizations
 */

// Active follow-up reasons (require agent action)
export const ACTIVE_FOLLOW_UP_REASONS = [
  "I don't know",
  "KAM needs to respond"
] as const;

// Completed churn reasons (final states)
export const COMPLETED_CHURN_REASONS = [
  "Outlet once out of Sync- now Active",
  "Renewal Payment Overdue",
  "Temporarily Closed (Renovation / Relocation/Internet issue)",
  "Permanently Closed (Outlet/brand)",
  "Event Account / Demo Account",
  "Switched to Another POS",
  "Ownership Transferred"
] as const;

// All available churn reasons (for dropdowns/modals)
export const ALL_CHURN_REASONS = [
  ...ACTIVE_FOLLOW_UP_REASONS,
  ...COMPLETED_CHURN_REASONS
] as const;

// Controlled churn reasons (within KAM's control)
export const CONTROLLED_CHURN_REASONS = [
  "KAM needs to respond",
  "I don't know",
  "Temporarily Closed (Renovation / Relocation/Internet issue)",
  "Switched to Another POS",
  "Ownership Transferred",
  "Renewal Payment Overdue"
] as const;

// Uncontrolled churn reasons (outside KAM's control)
export const UNCONTROLLED_CHURN_REASONS = [
  "Outlet once out of Sync- now Active",
  "Permanently Closed (Outlet/brand)",
  "Event Account / Demo Account"
] as const;

// Helper function to check if a reason is a "no agent response" state
export function isNoAgentResponse(churnReason: string | null | undefined): boolean {
  if (!churnReason || churnReason.trim() === '') return true;
  const normalized = churnReason.trim();
  return ACTIVE_FOLLOW_UP_REASONS.includes(normalized as any);
}

// Helper function to check if a reason is completed
export function isCompletedReason(churnReason: string | null | undefined): boolean {
  if (!churnReason || churnReason.trim() === '') return false;
  const normalized = churnReason.trim();
  return COMPLETED_CHURN_REASONS.some(reason => 
    normalized.toLowerCase().includes(reason.toLowerCase())
  );
}

// Helper function to determine controlled status
export function getControlledStatus(churnReason: string | null | undefined): string {
  if (!churnReason || churnReason.trim() === '') {
    return "Unknown";
  }

  const reason = churnReason.trim();
  const reasonLower = reason.toLowerCase();
  
  // Check exact matches first
  if (CONTROLLED_CHURN_REASONS.some(r => r === reason)) return "Controlled";
  if (UNCONTROLLED_CHURN_REASONS.some(r => r === reason)) return "Uncontrolled";
  
  // Check substring matches
  for (const controlledReason of CONTROLLED_CHURN_REASONS) {
    if (reasonLower.includes(controlledReason.toLowerCase())) return "Controlled";
  }
  for (const uncontrolledReason of UNCONTROLLED_CHURN_REASONS) {
    if (reasonLower.includes(uncontrolledReason.toLowerCase())) return "Uncontrolled";
  }
  
  return "Unknown";
}

// Type exports
export type ActiveFollowUpReason = typeof ACTIVE_FOLLOW_UP_REASONS[number];
export type CompletedChurnReason = typeof COMPLETED_CHURN_REASONS[number];
export type ChurnReason = typeof ALL_CHURN_REASONS[number];
export type ControlledStatus = "Controlled" | "Uncontrolled" | "Unknown";
