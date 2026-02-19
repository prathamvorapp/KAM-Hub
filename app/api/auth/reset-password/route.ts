import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/userService';

const userService = new UserService();

// Validation schema
const ResetPasswordSchema = z.object({
  email: z.string().email(),
  new_password: z.string().min(6)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
  } catch (error) {
    console.log(`❌ Reset password error: ${error}`);
    return NextResponse.json({
      success: false,
      message: 'Failed to reset password',
      error: String(error)
    }, { status: 500 });
  }
}
