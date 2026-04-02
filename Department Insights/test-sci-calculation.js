const { CSVParser } = require('./lib/csv-parser.ts')

async function testSCI() {
  console.log('🔍 Testing Switching Cost Index Calculation\n')
  
  const parser = new CSVParser('Data')
  
  try {
    const [brandRecords, kamRecords] = await Promise.all([
      parser.parseBrandData(),
      parser.parseKAMData()
    ])
    
    console.log(`✅ Loaded ${brandRecords.length} brand records`)
    console.log(`✅ Loaded ${kamRecords.length} KAM records\n`)
    
    // Import the SCI calculator
    const { calculateSwitchingCostIndex } = require('./lib/switching-cost-calculator.ts')
    
    const sciResults = calculateSwitchingCostIndex(brandRecords, kamRecords)
    
    console.log(`📊 Calculated SCI for ${sciResults.length} brands\n`)
    console.log('Top 10 Brands by Switching Cost Index:')
    console.log('='.repeat(100))
    console.log(
      'Rank'.padEnd(6) +
      'Brand Name'.padEnd(30) +
      'KAM'.padEnd(20) +
      'Outlets'.padEnd(10) +
      'Density'.padEnd(10) +
      'Spread'.padEnd(10) +
      'SCI'.padEnd(10) +
      'Category'
    )
    console.log('='.repeat(100))
    
    sciResults.slice(0, 10).forEach((sci, index) => {
      console.log(
        `${(index + 1).toString().padEnd(6)}` +
        `${sci.brandName.substring(0, 28).padEnd(30)}` +
        `${sci.kamName.substring(0, 18).padEnd(20)}` +
        `${sci.totalOutlets.toString().padEnd(10)}` +
        `${sci.density.toFixed(2).padEnd(10)}` +
        `${sci.spreadScore.toFixed(3).padEnd(10)}` +
        `${sci.sci.toFixed(3).padEnd(10)}` +
        `${sci.switchingCostCategory}`
      )
    })
    
    console.log('\n📈 Summary Statistics:')
    console.log(`   Total Brands: ${sciResults.length}`)
    console.log(`   High Switching Cost: ${sciResults.filter(s => s.switchingCostCategory === 'High').length}`)
    console.log(`   Medium Switching Cost: ${sciResults.filter(s => s.switchingCostCategory === 'Medium').length}`)
    console.log(`   Low Switching Cost: ${sciResults.filter(s => s.switchingCostCategory === 'Low').length}`)
    
    const avgSCI = sciResults.reduce((sum, s) => sum + s.sci, 0) / sciResults.length
    console.log(`   Average SCI: ${avgSCI.toFixed(3)}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testSCI()
