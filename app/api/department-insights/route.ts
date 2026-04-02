import { NextResponse, NextRequest } from 'next/server'
import { loadCSVData } from '@/lib/di-csv-loader'
import { CSVParseError } from '@/lib/di-csv-parser'
import { authenticateRequest } from '@/lib/api-auth'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')

    if (file) {
      const fileMap: Record<string, string> = {
        brand: 'Data/Brand DATA CSV.csv',
        revenue: 'Data/Revenue.csv',
        expense: 'Data/Expense.csv',
        churn: 'Data/Churn.csv',
        kam: 'Data/KAM Data CSV.csv',
      }

      const filePath = fileMap[file]
      if (!filePath) {
        return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 })
      }

      const fullPath = path.join(process.cwd(), filePath)
      const csvContent = fs.readFileSync(fullPath, 'utf-8')

      return new NextResponse(csvContent, {
        headers: { 'Content-Type': 'text/csv' },
      })
    }

    const data = await loadCSVData()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CSVParseError) {
      return NextResponse.json(
        { error: error.message, fileName: error.fileName },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Failed to load CSV data' }, { status: 500 })
  }
}
