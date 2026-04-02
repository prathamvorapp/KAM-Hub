import { NextResponse, NextRequest } from 'next/server'
import { loadCSVData } from '@/lib/csv-loader'
import { CSVParseError } from '@/lib/csv-parser'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')

    // If specific file requested, return raw CSV
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
        headers: {
          'Content-Type': 'text/csv',
        },
      })
    }

    // Default: return all parsed data
    const data = await loadCSVData()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CSVParseError) {
      return NextResponse.json(
        { error: error.message, fileName: error.fileName },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to load CSV data' },
      { status: 500 }
    )
  }
}
