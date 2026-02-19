import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { momService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`📤 Exporting MOMs for: ${user.email}`);

    const result = await momService.getMOMs({
      userProfile: user as any,
      page: 1,
      limit: 10000 // Get all for export
    });

    // Convert to CSV format
    const moms = result.data;
    const csvRows = [];
    
    // Header
    csvRows.push('Ticket ID,Title,Status,Priority,Brand,Created By,Created At');
    
    // Data rows
    moms.forEach((mom: any) => {
      csvRows.push([
        mom.ticket_id,
        mom.title,
        mom.status,
        mom.priority,
        mom.brand_name || '',
        mom.created_by,
        mom.created_at
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="moms_export_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });

  } catch (error) {
    console.error('[MOM Export] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
