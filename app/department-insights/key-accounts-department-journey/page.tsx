'use client'

import { useBrands, usePrices, useRevenueRecords, useDataContext } from '@/lib/di-data-context'
import { MilestoneGenerator } from '@/lib/di-milestone-generator'
import { JourneyVisualizer } from '@/components/di/JourneyVisualizer'
import { TimelineSkeleton } from '@/components/di/TimelineSkeleton'

export default function KeyAccountsDepartmentJourneyPage() {
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

  // Generate department timeline with revenue records
  const milestoneGenerator = new MilestoneGenerator(prices, revenueRecords)
  const timelineData = milestoneGenerator.generateDepartmentTimeline(brands)

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <JourneyVisualizer
        timelineData={timelineData}
        type="department"
        title="Key Accounts Department Journey"
      />
    </main>
  )
}
