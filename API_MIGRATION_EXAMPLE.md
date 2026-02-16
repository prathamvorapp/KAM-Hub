# API Route Migration Example

## Example: Migrating Churn API Route

### BEFORE (Convex - Old Code)

```typescript
// app/api/churn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChurnQuerySchema } from '../../../lib/models/churn';
import { ChurnService } from '../../../lib/services/churnService';
import NodeCache from 'node-cache';

const churnService = new ChurnService();
const churnDataCache = new NodeCache({ stdTTL: 60 });

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || undefined;

    const queryData = ChurnQuerySchema.parse({ page, limit, search });

    const cacheKey = `churn_data_${userEmail}_${page}_${limit}_${search || 'no_search'}`;
    const cachedResult = churnDataCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // OLD: Using Convex-based ChurnService class
    const result = await churnService.getChurnDataWithRoleFilter(
      userEmail,
      queryData.page,
      queryData.limit,
      queryData.search
    );

    const response = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      user_info: { role: userRole, email: userEmail },
      missing_churn_reasons: result.missing_churn_reasons,
      categorization: result.categorization
    };

    churnDataCache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn data',
      detail: String(error)
    }, { status: 500 });
  }
}
```

### AFTER (Supabase - New Code)

```typescript
// app/api/churn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChurnQuerySchema } from '../../../lib/models/churn';
import { churnService } from '@/lib/services'; // NEW: Import from services index
import NodeCache from 'node-cache';

const churnDataCache = new NodeCache({ stdTTL: 60 });

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || undefined;

    const queryData = ChurnQuerySchema.parse({ page, limit, search });

    const cacheKey = `churn_data_${userEmail}_${page}_${limit}_${search || 'no_search'}`;
    const cachedResult = churnDataCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // NEW: Using Supabase-based churnService
    const result = await churnService.getChurnData({
      email: userEmail,
      page: queryData.page,
      limit: queryData.limit,
      search: queryData.search
    });

    const response = {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.has_next,
        has_prev: result.has_prev
      },
      user_info: { 
        role: result.user_role || userRole, 
        email: userEmail 
      },
      missing_churn_reasons: result.missing_churn_reasons,
      categorization: result.categorization
    };

    churnDataCache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch churn data',
      detail: String(error)
    }, { status: 500 });
  }
}
```

## Key Changes

1. **Import Change**
   ```typescript
   // OLD
   import { ChurnService } from '../../../lib/services/churnService';
   const churnService = new ChurnService();
   
   // NEW
   import { churnService } from '@/lib/services';
   ```

2. **Function Call Change**
   ```typescript
   // OLD
   const result = await churnService.getChurnDataWithRoleFilter(
     userEmail,
     queryData.page,
     queryData.limit,
     queryData.search
   );
   
   // NEW
   const result = await churnService.getChurnData({
     email: userEmail,
     page: queryData.page,
     limit: queryData.limit,
     search: queryData.search
   });
   ```

3. **Response Structure** - Mostly the same, just map the fields correctly

## More Examples

### Update Churn Reason API

```typescript
// app/api/churn/update-reason/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { churnService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { rid, churn_reason, remarks, mail_sent_confirmation } = body;

    // NEW: Direct service call
    const result = await churnService.updateChurnReason({
      rid,
      churn_reason,
      remarks,
      mail_sent_confirmation,
      email: userEmail
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update churn reason',
      detail: String(error)
    }, { status: 500 });
  }
}
```

### Visit Statistics API

```typescript
// app/api/data/visits/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { visitService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // NEW: Direct service call
    const statistics = await visitService.getVisitStatistics(userEmail);

    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch visit statistics',
      detail: String(error)
    }, { status: 500 });
  }
}
```

### Demo Applicability API

```typescript
// app/api/data/demos/[demoId]/applicability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { demoService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: { demoId: string } }
) {
  try {
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { isApplicable, nonApplicableReason } = body;

    // NEW: Direct service call
    const result = await demoService.setProductApplicability({
      demoId: params.demoId,
      isApplicable,
      nonApplicableReason
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to set product applicability',
      detail: String(error)
    }, { status: 500 });
  }
}
```

## Pattern Summary

For ALL API routes, follow this pattern:

1. **Import the service**
   ```typescript
   import { churnService, visitService, demoService, etc } from '@/lib/services';
   ```

2. **Get user authentication** (keep existing auth logic)
   ```typescript
   const userEmail = request.headers.get('x-user-email');
   // ... auth checks
   ```

3. **Call the service function** (replace old class method calls)
   ```typescript
   const result = await serviceName.functionName({ params });
   ```

4. **Return the response** (keep existing response structure)
   ```typescript
   return NextResponse.json({ success: true, data: result });
   ```

## Testing Checklist

After updating each API route:

- [ ] Test with Agent role
- [ ] Test with Team Lead role
- [ ] Test with Admin role
- [ ] Test pagination
- [ ] Test search/filtering
- [ ] Test error handling
- [ ] Test caching (if applicable)

## Common Pitfalls

1. **Don't forget to pass `email` parameter** - Services need it for role-based filtering
2. **Use object parameters** - New services use object params, not positional
3. **Check return structure** - Map response fields correctly
4. **Handle errors** - Services throw errors, wrap in try-catch
5. **Import from index** - Use `@/lib/services` not individual files

---

This pattern applies to ALL API routes. Update them one by one and test thoroughly!
