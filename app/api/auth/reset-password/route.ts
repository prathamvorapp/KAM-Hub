import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/userService';
import { createServiceRoleClient } from '../../../../lib/supabase-server';

const userService = new UserService();

// Validation schema for forgot password (email only)
const ForgotPasswordSchema = z.object({
  email: z.string().email()
});

// Validation schema for reset password (email + new password)
const ResetPasswordSchema = z.object({
  email: z.string().email(),
  new_password: z.string().min(6)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a forgot password request (email only) or reset password request (email + password)
    if (!body.new_password) {
      // Forgot password flow - send reset email via Supabase Auth
      const { email } = ForgotPasswordSchema.parse(body);
      
      console.log(`📧 Forgot password request for: ${email}`);
      
      const supabase = createServiceRoleClient();
      
      // Send password reset email using Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`
      });
      
      if (error) {
        console.error('❌ Error sending reset email:', error);
        // Don't reveal if email exists or not for security
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.'
        });
      }
      
      console.log(`✅ Password reset email sent to: ${email}`);
      
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } else {
      // Reset password flow - validate and update password
      const { email, new_password } = ResetPasswordSchema.parse(body);
      
      console.log(`🔍 Password reset attempt for: ${email}`);
      
      const result = await userService.setUserPassword(email, new_password);
      
      if (result.success) {
        console.log(`✅ Password reset successful for: ${email}`);
        return NextResponse.json({
          success: true,
          message: 'Password reset successfully. You can now login with your new password.'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to reset password',
          error: result.error || 'User not found or password update failed'
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.log(`❌ Reset password error: ${error}`);
    return NextResponse.json({
      success: false,
      message: 'Failed to process request',
      error: String(error)
    }, { status: 500 });
  }
}
