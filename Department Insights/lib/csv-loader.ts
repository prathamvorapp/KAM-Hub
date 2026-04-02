import { CSVParser } from './csv-parser'
import { BrandWithKAM, PriceRecord, RevenueRecord, ChurnRecord, PriceData, ExpenseRecord } from './types'

export async function loadCSVData() {
  const parser = new CSVParser('Data')
  
  const [brandRecords, kamRecords, priceRecords, revenueRecords, churnRecords, expenseRecords] = await Promise.all([
    parser.parseBrandData(),
    parser.parseKAMData(),
    parser.parsePriceData(),
    parser.parseRevenueData(),
    parser.parseChurnData(),
    parser.parseExpenseData(),
  ])

  const brandsWithKAM = parser.crossReference(brandRecords, kamRecords)

  console.log(`📊 Loaded ${revenueRecords.length} revenue records from Revenue.csv`)
  console.log(`📉 Loaded ${churnRecords.length} churn records from Churn.csv`)
  console.log(`💰 Loaded ${expenseRecords.length} expense records from Expense.csv`)

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
