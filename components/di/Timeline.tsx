'use client'

import { Milestone } from '@/lib/di-types'
import { format } from 'date-fns'

interface TimelineProps {
  startDate: Date
  endDate: Date
  milestones: Milestone[]
  onMilestoneClick?: (milestone: Milestone) => void
}

export function Timeline({ startDate, endDate, milestones, onMilestoneClick }: TimelineProps) {
  return (
    <div className="w-full py-8 px-4">
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 -translate-y-1/2" />
          
          {/* Date labels */}
          <div className="flex justify-between mb-4 text-sm text-gray-600">
            <span>{format(startDate, 'MMM yyyy')}</span>
            <span>{format(endDate, 'MMM yyyy')}</span>
          </div>
          
          {/* Milestones container */}
          <div className="relative flex justify-between items-center min-h-[200px]">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => onMilestoneClick?.(milestone)}
              >
                {/* Milestone node */}
                <div
                  className={`w-4 h-4 rounded-full border-2 bg-white z-10 ${
                    milestone.isProjected
                      ? 'border-gray-400 border-dashed'
                      : 'border-gray-700'
                  }`}
                />
                
                {/* Date label */}
                <div className="mt-2 text-xs text-gray-600 text-center">
                  {format(milestone.date, 'MMM yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Vertical Layout */}
      <div className="md:hidden">
        <div className="relative pl-8">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
          
          {/* Milestones */}
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="relative cursor-pointer"
                onClick={() => onMilestoneClick?.(milestone)}
              >
                {/* Milestone node */}
                <div
                  className={`absolute -left-[26px] w-4 h-4 rounded-full border-2 bg-white ${
                    milestone.isProjected
                      ? 'border-gray-400 border-dashed'
                      : 'border-gray-700'
                  }`}
                />
                
                {/* Date label */}
                <div className="text-sm text-gray-600">
                  {format(milestone.date, 'MMM yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
