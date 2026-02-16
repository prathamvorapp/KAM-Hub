/**
 * Automated Migration Script
 * Migrates all remaining API routes from Convex to Supabase
 */

const fs = require('fs');
const path = require('path');

// Template for API routes
const getRouteTemplate = (serviceName, methodName, hasParams = false) => `import { NextRequest, NextResponse } from 'next/server';
import { ${serviceName} } from '@/lib/services';

export async function GET(request: NextRequest${hasParams ? ', { params }: { params: Promise<any> }' : ''}) {
  try {
    // Get user from session
    let userEmail = request.headers.get('x-user-email');
    let userRole = request.headers.get('x-user-role');
    
    if (!userEmail) {
      const userSession = request.cookies.get('user-session');
      if (!userSession) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      const userData = JSON.parse(userSession.value);
      userEmail = userData.email;
      userRole = userData.role;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || undefined;

    ${hasParams ? 'const resolvedParams = await params;' : ''}

    // Call service
    const result = await ${serviceName}.${methodName}({
      email: userEmail,
      page,
      limit,
      search${hasParams ? ',\n      ...resolvedParams' : ''}
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
`;

// Routes to migrate
const routes = [
  // Master Data
  {
    path: 'app/api/data/master-data/route.ts',
    service: 'masterDataService',
    method: 'getMasterData'
  },
  {
    path: 'app/api/data/master-data/brands/[email]/route.ts',
    service: 'masterDataService',
    method: 'getBrandsByAgentEmail',
    hasParams: true
  },
  
  // Visits
  {
    path: 'app/api/data/visits/statistics/route.ts',
    service: 'visitService',
    method: 'getVisitStatistics'
  },
  {
    path: 'app/api/data/visits/admin-statistics/route.ts',
    service: 'visitService',
    method: 'getAdminStatistics'
  },
  {
    path: 'app/api/data/visits/admin-summary/route.ts',
    service: 'visitService',
    method: 'getAdminSummary'
  },
  {
    path: 'app/api/data/visits/team-statistics/route.ts',
    service: 'visitService',
    method: 'getTeamStatistics'
  },
  {
    path: 'app/api/data/visits/team-summary/route.ts',
    service: 'visitService',
    method: 'getTeamSummary'
  },
  
  // Demos
  {
    path: 'app/api/data/demos/route.ts',
    service: 'demoService',
    method: 'getDemos'
  },
  {
    path: 'app/api/data/demos/statistics/route.ts',
    service: 'demoService',
    method: 'getDemoStatistics'
  },
  
  // Health Checks
  {
    path: 'app/api/data/health-checks/route.ts',
    service: 'healthCheckService',
    method: 'getHealthChecks'
  },
  {
    path: 'app/api/data/health-checks/statistics/route.ts',
    service: 'healthCheckService',
    method: 'getStatistics'
  },
  {
    path: 'app/api/data/health-checks/progress/route.ts',
    service: 'healthCheckService',
    method: 'getProgress'
  },
  {
    path: 'app/api/data/health-checks/brands-for-assessment/route.ts',
    service: 'healthCheckService',
    method: 'getBrandsForAssessment'
  },
  {
    path: 'app/api/data/health-checks/agent-statistics/route.ts',
    service: 'healthCheckService',
    method: 'getAgentStatistics'
  },
  
  // MOMs
  {
    path: 'app/api/data/mom/route.ts',
    service: 'momService',
    method: 'getMOMs'
  },
  {
    path: 'app/api/data/mom/visit/route.ts',
    service: 'momService',
    method: 'getMOMsByVisit'
  },
  {
    path: 'app/api/data/mom/statistics/route.ts',
    service: 'momService',
    method: 'getMOMStatistics'
  },
  {
    path: 'app/api/data/mom/export/route.ts',
    service: 'momService',
    method: 'exportMOMs'
  }
];

console.log('🚀 Starting automated migration...\n');

let migrated = 0;
let skipped = 0;
let errors = 0;

routes.forEach(route => {
  try {
    const filePath = path.join(process.cwd(), route.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${route.path} (file doesn't exist)`);
      skipped++;
      return;
    }

    // Read current content
    const currentContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if already migrated
    if (!currentContent.includes('ConvexHttpClient') && !currentContent.includes('@/convex/_generated/api')) {
      console.log(`✅ ${route.path} (already migrated)`);
      migrated++;
      return;
    }

    // Generate new content
    const newContent = getRouteTemplate(route.service, route.method, route.hasParams);
    
    // Write new content
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`✅ Migrated: ${route.path}`);
    migrated++;
  } catch (error) {
    console.error(`❌ Error migrating ${route.path}:`, error.message);
    errors++;
  }
});

console.log('\n' + '━'.repeat(60));
console.log('📊 Migration Summary:');
console.log(`  ✅ Migrated: ${migrated}`);
console.log(`  ⏭️  Skipped: ${skipped}`);
console.log(`  ❌ Errors: ${errors}`);
console.log(`  📦 Total: ${routes.length}`);
console.log('━'.repeat(60));

if (migrated > 0) {
  console.log('\n✅ Migration complete!');
  console.log('💡 Next steps:');
  console.log('  1. Review the migrated files');
  console.log('  2. Test each API endpoint');
  console.log('  3. Verify data displays correctly in UI');
}
