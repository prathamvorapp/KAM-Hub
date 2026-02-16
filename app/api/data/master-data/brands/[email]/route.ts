import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, canAccessAllData, canAccessTeamData } from '../../../../../../lib/auth-helpers';
import { masterDataService } from '@/lib/services';
import NodeCache from 'node-cache';

// Cache for agent brands
const agentBrandsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    // Check if user can access this agent's data
    if (!canAccessAllData(user) && !canAccessTeamData(user) && user.email !== email) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Cache key
    const cacheKey = `agent_brands_${email}_${page}_${limit}_${search}`;
    
    const cachedData = agentBrandsCache.get(cacheKey);
    if (cachedData) {
      console.log(`📈 Agent brands served from cache for: ${email}`);
      return NextResponse.json(cachedData);
    }

    console.log(`📊 Getting brands for agent: ${email}`);

    // Get brands for specific agent from Supabase
    const brands = await masterDataService.getBrandsByAgentEmail(email);
    
    // Apply search filter
    let filteredBrands = brands;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBrands = brands.filter((brand: any) =>
        brand.brand_name?.toLowerCase().includes(searchLower) ||
        brand.kam_name?.toLowerCase().includes(searchLower) ||
        brand.zone?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedBrands = filteredBrands.slice(startIndex, startIndex + limit);
    
    const result = {
      data: paginatedBrands,
      total: filteredBrands.length,
      page,
      limit,
      total_pages: Math.ceil(filteredBrands.length / limit)
    };

    const response = {
      success: true,
      data: result
    };

    // Cache the response
    agentBrandsCache.set(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting agent brands:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load agent brands',
      detail: String(error)
    }, { status: 500 });
  }
}