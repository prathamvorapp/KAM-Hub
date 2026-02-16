# Optimized API Route Pattern

## Standard Pattern for All API Routes

All API routes should follow this optimized pattern for consistency, error handling, and performance.

### Example: Optimized API Route

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  successResponse, 
  errorResponse, 
  handleDatabaseError,
  getUserFromHeaders,
  parsePaginationParams,
  logApiRequest,
  logResponseTime,
  validateRequiredFields
} from '@/lib/api-utils';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { yourService } from '@/lib/services';

// Validation schema
const QuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(100),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  try {
    // 1. Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, 'api');
    
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset);
    }
    
    // 2. Authentication
    const user = getUserFromHeaders(request.headers);
    if (!user.email) {
      return errorResponse('Authentication required', 401);
    }
    
    // 3. Parse and validate parameters
    const { page, limit } = parsePaginationParams(searchParams);
    const search = searchParams.get('search') || undefined;
    
    // 4. Log request (development only)
    logApiRequest('GET', '/api/your-route', user.email, { page, limit, search });
    
    // 5. Call service
    const result = await yourService.getData({
      email: user.email,
      page,
      limit,
      search,
    });
    
    // 6. Log response time
    logResponseTime('GET', '/api/your-route', Date.now() - startTime, true);
    
    // 7. Return success response
    return successResponse(result);
    
  } catch (error: any) {
    // Log error response time
    logResponseTime('GET', '/api/your-route', Date.now() - startTime, false);
    
    // Handle database errors
    if (error.code || error.message?.includes('Supabase')) {
      return handleDatabaseError(error, 'getData');
    }
    
    // Handle other errors
    return errorResponse(
      'Failed to fetch data',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, 'api');
    
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset);
    }
    
    // 2. Authentication
    const user = getUserFromHeaders(request.headers);
    if (!user.email) {
      return errorResponse('Authentication required', 401);
    }
    
    // 3. Parse request body
    const body = await request.json();
    
    // 4. Validate required fields
    const validation = validateRequiredFields(body, ['field1', 'field2']);
    if (!validation.valid) {
      return errorResponse(
        `Missing required fields: ${validation.missing?.join(', ')}`,
        400
      );
    }
    
    // 5. Validate with Zod
    const DataSchema = z.object({
      field1: z.string(),
      field2: z.string(),
      field3: z.number().optional(),
    });
    
    const validatedData = DataSchema.parse(body);
    
    // 6. Log request
    logApiRequest('POST', '/api/your-route', user.email, validatedData);
    
    // 7. Call service
    const result = await yourService.createData({
      ...validatedData,
      created_by: user.email,
    });
    
    // 8. Log response time
    logResponseTime('POST', '/api/your-route', Date.now() - startTime, true);
    
    // 9. Return success response
    return successResponse(result, 'Data created successfully', 201);
    
  } catch (error: any) {
    logResponseTime('POST', '/api/your-route', Date.now() - startTime, false);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(
        'Validation error',
        400,
        error.errors
      );
    }
    
    // Handle database errors
    if (error.code || error.message?.includes('Supabase')) {
      return handleDatabaseError(error, 'createData');
    }
    
    // Handle other errors
    return errorResponse(
      'Failed to create data',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
}
```

## Key Features

1. **Rate Limiting**: Prevents abuse
2. **Authentication**: Validates user session
3. **Input Validation**: Uses Zod for type-safe validation
4. **Error Handling**: Comprehensive error handling with proper status codes
5. **Logging**: Development-only logging for debugging
6. **Performance Monitoring**: Tracks execution time
7. **Standardized Responses**: Consistent API response format
8. **Type Safety**: Full TypeScript support

## Benefits

- Consistent error handling across all routes
- Better debugging with detailed logs
- Protection against abuse with rate limiting
- Type-safe request/response handling
- Easy to maintain and extend
- Production-ready with security best practices

## Migration Checklist

For each API route:
- [ ] Add rate limiting
- [ ] Use getUserFromHeaders for authentication
- [ ] Implement input validation with Zod
- [ ] Use standardized response functions
- [ ] Add error handling with handleDatabaseError
- [ ] Add logging (development only)
- [ ] Test all endpoints
- [ ] Update documentation
