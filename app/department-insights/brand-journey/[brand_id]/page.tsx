'use client'

import { useBrands, usePrices, useRevenueRecords, useDataContext } from '@/lib/di-data-context'
import { MilestoneGenerator } from '@/lib/di-milestone-generator'
import { JourneyVisualizer } from '@/components/di/JourneyVisualizer'
import { TimelineSkeleton } from '@/components/di/TimelineSkeleton'
import { useParams } from 'next/navigation'

export default function BrandJourneyPage() {
  const params = useParams()
  const brandId = params.brand_id as string
  
  const brands = useBrands()
  const prices = usePrices()
  const revenueRecords = useRevenueRecords()
  const { isLoading, error } = useDataContext()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <TimelineSkeleton />
      </main>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (brands.length === 0 || prices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">No data available. Please ensure CSV files are loaded.</div>
      </div>
    )
  }

  const brand = brands.find(
    b => b.restaurant_id === brandId || b.email === brandId
  )

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-800 text-2xl font-semibold mb-4">Brand Not Found</div>
        <div className="text-gray-600 mb-6">
          The brand with ID &quot;{brandId}&quot; could not be found.
        </div>
        <a
          href="/department-insights/key-accounts-department-journey"
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Back to Department Journey
        </a>
      </div>
    )
  }

  const milestoneGenerator = new MilestoneGenerator(prices, revenueRecords)
  const timelineData = milestoneGenerator.generateBrandTimeline(brand)

  const brandName = brand.kam_assignment?.brand_name || brand.email
  const title = `Brand Journey: ${brandName}`

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <JourneyVisualizer
        timelineData={timelineData}
        type="brand"
        title={title}
      />
    </main>
  )
}
