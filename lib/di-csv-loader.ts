import { CSVParser } from './di-csv-parser'
import { BrandWithKAM, PriceRecord, RevenueRecord, ChurnRecord, PriceData, ExpenseRecord } from './di-types'
import path from 'path'

export async function loadCSVData() {
  const dataDir = path.join(process.cwd(), 'Data')
  const parser = new CSVParser(dataDir)
  
  const [brandRecords, kamRecords, priceRecords, revenueRecords, churnRecords, expenseRecords] = await Promise.all([
    parser.parseBrandData(),
    parser.parseKAMData(),
    parser.parsePriceData(),
    parser.parseRevenueData(),
    parser.parseChurnData(),
    parser.parseExpenseData(),
  ])

  const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)

  // Convert PriceRecord to PriceData format
  const priceData: PriceData[] = priceRecords.map(p => ({
    service_product_name: p.service_product_name,
    price: p.price
  }))

  return {
    brands: brandsWithKAM,
    brandRecords,
    kamRecords,
    prices: priceRecords,
    priceData,
    revenueRecords,
    churnRecords,
    expenseRecords,
    warnings: parser.warnings,
  }
}
