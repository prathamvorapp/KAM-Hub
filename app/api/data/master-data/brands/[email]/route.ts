import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { masterDataService } from '@/lib/services';
import NodeCache from 'node-cache';

// Cache for agent brands
const agentBrandsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000'); // High default to get all brands
    const search = searchParams.get('search') || '';

    // Check if user can access this agent's data
    const canAccessAll = user.role === 'Admin';
    const canAccessTeam = user.role === 'Team Lead';
    
    if (!canAccessAll && !canAccessTeam && user.email !== email) {
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
    const brands = await masterDataService.getBrandsByAgentEmail(user as any, email);
    
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
    console.error('[Master Data Brands] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}