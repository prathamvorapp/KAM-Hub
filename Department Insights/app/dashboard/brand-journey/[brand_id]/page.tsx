'use client'

import { useBrands, usePrices, useRevenueRecords, useDataContext } from '@/lib/data-context'
import { MilestoneGenerator } from '@/lib/milestone-generator'
import { JourneyVisualizer } from '@/components/JourneyVisualizer'
import { TimelineSkeleton } from '@/components/TimelineSkeleton'
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

  // Find the specific brand by restaurant_id or email
  const brand = brands.find(
    b => b.restaurant_id === brandId || b.email === brandId
  )

  // Handle invalid brand_id with 404 message
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-800 text-2xl font-semibold mb-4">Brand Not Found</div>
        <div className="text-gray-600 mb-6">
          The brand with ID "{brandId}" could not be found.
        </div>
        <a
          href="/dashboard/key-accounts-department-journey"
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Back to Department Journey
        </a>
      </div>
    )
  }

  // Generate brand timeline with revenue records
  const milestoneGenerator = new MilestoneGenerator(prices, revenueRecords)
  const timelineData = milestoneGenerator.generateBrandTimeline(brand)

  // Debug: Log timeline data being passed to visualizer
  console.log('Timeline data for visualizer:', {
    totalMilestones: timelineData.milestones.length,
    months: timelineData.milestones.map(m => ({
      month: `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`,
      label: m.label
    }))
  })

  // Create title with brand name
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
