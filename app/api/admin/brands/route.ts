import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Database } from '@/lib/supabase-types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/brands
 * Create a new brand
 * Admin and Team Lead only
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // All authenticated users can create brands
    console.log(`✅ [Create Brand] User ${user.email} (${user.role}) creating brand`);

    const body = await request.json();
    const { 
      brand_name, 
      brand_email_id, 
      kam_name,
      kam_email_id, 
      brand_state, 
      zone,
      kam_name_secondary,
      outlet_counts 
    } = body;

    // Validation
    if (!brand_name || !kam_email_id || !brand_state || !zone || !kam_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: brand_name, kam_name, kam_email_id, brand_state, zone'
      }, { status: 400 });
    }

    console.log(`➕ Creating new brand:`, {
      brand_name,
      kam_email_id,
      createdBy: user.email
    });

    const supabase = await createServerSupabaseClient();

    // Check if brand already exists
    const { data: existingBrand } = await supabase
      .from('master_data')
      .select('id, brand_name')
      .eq('brand_name', brand_name)
      .single();

    if (existingBrand) {
      return NextResponse.json({
        success: false,
        error: `Brand "${brand_name}" already exists`
      }, { status: 400 });
    }

    // Verify KAM exists in user_profiles
    const { data: kamProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name, team_name')
      .eq('email', kam_email_id)
      .eq('is_active', true)
      .single();

    if (!kamProfile) {
      return NextResponse.json({
        success: false,
        error: `KAM with email "${kam_email_id}" not found or inactive`
      }, { status: 400 });
    }

    // Insert new brand
    const insertData: Database['public']['Tables']['master_data']['Insert'] = {
      brand_name,
      brand_email_id: brand_email_id || null,
      kam_name,
      kam_email_id,
      brand_state,
      zone,
      kam_name_secondary: kam_name_secondary || null,
      outlet_counts: outlet_counts || 0
    };

    const { data: newBrand, error: insertError } = await (supabase
      .from('master_data') as any)
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating brand:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create brand: ' + insertError.message
      }, { status: 500 });
    }

    console.log(`✅ Brand created successfully:`, newBrand.id);

    return NextResponse.json({
      success: true,
      data: {
        message: `Brand "${brand_name}" created successfully and assigned to ${kam_name}`,
        brand: newBrand
      }
    });

  } catch (error) {
    console.error('[Create Brand] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
