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

/**
 * PATCH /api/admin/brands
 * Update brand information
 * Admin and Team Lead only
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`✅ [Update Brand] User ${user.email} (${user.role}) updating brand`);

    const body = await request.json();
    const { 
      brandId,
      brand_name, 
      brand_email_id,
      outlet_counts 
    } = body;

    // Validation
    if (!brandId) {
      return NextResponse.json({
        success: false,
        error: 'Brand ID is required'
      }, { status: 400 });
    }

    if (!brand_name) {
      return NextResponse.json({
        success: false,
        error: 'Brand name is required'
      }, { status: 400 });
    }

    console.log(`📝 Updating brand:`, {
      brandId,
      brand_name,
      updatedBy: user.email
    });

    const supabase = await createServerSupabaseClient();

    // Check if brand exists
    const { data: existingBrandData, error: fetchError } = await supabase
      .from('master_data')
      .select('id, brand_name, brand_email_id, outlet_counts, kam_history')
      .eq('id', brandId)
      .single();

    if (fetchError || !existingBrandData) {
      return NextResponse.json({
        success: false,
        error: 'Brand not found'
      }, { status: 404 });
    }

    // Type assertion to help TypeScript understand the type
    type BrandData = {
      id: string;
      brand_name: string;
      brand_email_id: string | null;
      outlet_counts: number;
      kam_history: any;
    };
    
    const existingBrand = existingBrandData as BrandData;

    // Check if new brand name conflicts with another brand
    if (brand_name !== existingBrand.brand_name) {
      const { data: nameConflict } = await supabase
        .from('master_data')
        .select('id, brand_name')
        .eq('brand_name', brand_name)
        .neq('id', brandId)
        .single();

      if (nameConflict) {
        return NextResponse.json({
          success: false,
          error: `Brand name "${brand_name}" is already used by another brand`
        }, { status: 400 });
      }
    }

    // Build change summary for history
    const changes: string[] = [];
    const now = new Date().toISOString();

    if (brand_name !== existingBrand.brand_name) {
      changes.push(`Brand name: "${existingBrand.brand_name}" → "${brand_name}"`);
    }

    if (brand_email_id !== existingBrand.brand_email_id) {
      changes.push(`Brand email: "${existingBrand.brand_email_id || 'N/A'}" → "${brand_email_id || 'N/A'}"`);
    }

    if (outlet_counts !== existingBrand.outlet_counts) {
      changes.push(`Outlet count: ${existingBrand.outlet_counts || 0} → ${outlet_counts || 0}`);
    }

    // If no changes, return early
    if (changes.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No changes detected',
          brand: existingBrand
        }
      });
    }

    // Add entry to kam_history for brand info edit
    const historyEntry = {
      action: 'brand_info_edit',
      changes: changes,
      edited_by: user.email,
      edited_at: now,
      reason: 'Brand information updated'
    };

    const updatedKamHistory = [...(existingBrand.kam_history || []), historyEntry];

    // Update brand
    const updateData: Partial<Database['public']['Tables']['master_data']['Update']> = {
      brand_name,
      brand_email_id: brand_email_id || null,
      outlet_counts: outlet_counts || 0,
      kam_history: updatedKamHistory as any
    };

    const { data: updatedBrand, error: updateError } = await (supabase
      .from('master_data') as any)
      .update(updateData)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating brand:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update brand: ' + updateError.message
      }, { status: 500 });
    }

    console.log(`✅ Brand updated successfully:`, updatedBrand.id);
    console.log(`📝 Changes recorded in kam_history:`, changes);

    return NextResponse.json({
      success: true,
      data: {
        message: `Brand information updated successfully`,
        brand: updatedBrand,
        changes: changes
      }
    });

  } catch (error) {
    console.error('[Update Brand] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
