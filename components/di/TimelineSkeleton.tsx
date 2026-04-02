'use client'

/**
 * Skeleton screen for timeline loading
 * Shows placeholder UI while timeline data is being generated
 * Requirements: 2.7
 */

export function TimelineSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto animate-pulse">
      {/* Title skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div>

      {/* Journey type indicator skeleton */}
      <div className="mb-6 flex justify-center">
        <div className="h-8 bg-gray-200 rounded-full w-32"></div>
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Timeline line skeleton */}
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-gray-200" />

          {/* Milestone skeletons */}
          <div className="grid grid-cols-5 gap-8">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center">
                  {/* Milestone card skeleton */}
                  <div className="mb-4 w-full">
                    <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                      {/* Date skeleton */}
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      
                      {/* Metrics skeletons */}
                      <div className="space-y-2">
                        <div className="bg-gray-200 p-2 rounded">
                          <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                          <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                        </div>
                        <div className="bg-gray-200 p-2 rounded">
                          <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                          <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                        </div>
                        <div className="bg-gray-200 p-2 rounded">
                          <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                          <div className="space-y-1">
                            <div className="h-3 bg-gray-300 rounded"></div>
                            <div className="h-3 bg-gray-300 rounded"></div>
                            <div className="h-3 bg-gray-300 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestone node skeleton */}
                  <div className="w-4 h-4 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Date range labels skeleton */}
          <div className="flex justify-between mt-4">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Layout */}
      <div className="md:hidden">
        <div className="relative pl-8">
          {/* Timeline line skeleton */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Milestone skeletons */}
          <div className="space-y-8">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="relative">
                {/* Milestone node skeleton */}
                <div className="absolute -left-[26px] top-4 w-4 h-4 rounded-full bg-gray-200" />

                {/* Milestone card skeleton */}
                <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                  {/* Date skeleton */}
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  
                  {/* Metrics skeletons */}
                  <div className="space-y-2">
                    <div className="bg-gray-200 p-2 rounded">
                      <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                      <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                    </div>
                    <div className="bg-gray-200 p-2 rounded">
                      <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                      <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                    </div>
                    <div className="bg-gray-200 p-2 rounded">
                      <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-300 rounded"></div>
                        <div className="h-3 bg-gray-300 rounded"></div>
                        <div className="h-3 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="mt-8 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  )
}
