'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: string[];
}

/**
 * RouteGuard Component
 * 
 * Provides client-side route protection based on authentication status and roles.
 * 
 * Usage:
 * <RouteGuard requireAuth={true} requireRole={['admin']}>
 *   <AdminDashboard />
 * </RouteGuard>
 */
export const RouteGuard = ({ 
  children, 
  requireAuth = true, 
  requireRole = [] 
}: RouteGuardProps) => {
  const { userProfile, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loading = !session && !userProfile; // Derive loading state

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !userProfile) {
        // User not authenticated, redirect to login
        console.log('🔒 [RouteGuard] Unauthorized - Redirecting to login');
        router.push('/login');
      } else if (!requireAuth && userProfile) {
        // User authenticated but on a non-auth page (like login), redirect to dashboard
        console.log('🔓 [RouteGuard] Already authenticated - Redirecting to dashboard');
        router.push('/dashboard/churn');
      } else if (requireAuth && userProfile && requireRole.length > 0) {
        // Check if user has one of the required roles
        const userRole = userProfile.role.toLowerCase();
        const hasRequiredRole = requireRole.some(role => 
          role.toLowerCase() === userRole || 
          role.toLowerCase().replace('_', ' ') === userRole ||
          role.toLowerCase().replace(' ', '_') === userRole
        );

        if (!hasRequiredRole) {
          console.log(`🚫 [RouteGuard] Forbidden - Role ${userProfile.role} not allowed for this route`);
          router.push('/dashboard/churn');
        }
      }
    }
  }, [userProfile, loading, requireAuth, requireRole, router, pathname]);

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If validation passed or still in progress but not loading, render children
  // (The useEffect will handle redirection)
  
  // Extra safety: Don't render protected content if not authenticated
  if (requireAuth && !userProfile) return null;
  
  // Don't render login page if already authenticated
  if (!requireAuth && userProfile) return null;

  // Don't render if role check failed (extra safety)
  if (requireAuth && userProfile && requireRole.length > 0) {
    const userRole = userProfile.role.toLowerCase();
    const hasRequiredRole = requireRole.some(role => 
      role.toLowerCase() === userRole || 
      role.toLowerCase().replace('_', ' ') === userRole ||
      role.toLowerCase().replace(' ', '_') === userRole
    );
    if (!hasRequiredRole) return null;
  }

  return <>{children}</>;
};
