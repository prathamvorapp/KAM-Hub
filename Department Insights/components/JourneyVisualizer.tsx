'use client'

import { TimelineData } from '@/lib/types'
import { Timeline } from './Timeline'
import { Milestone } from './Milestone'
import { motion } from 'framer-motion'

interface JourneyVisualizerProps {
  timelineData: TimelineData
  type: 'department' | 'brand'
  title?: string
}

export function JourneyVisualizer({ timelineData, type, title }: JourneyVisualizerProps) {
  const { milestones, startDate, endDate } = timelineData

  return (
    <motion.div 
      className="w-full max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Title */}
      {title && (
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl font-semibold text-gray-800 mb-8 text-center"
        >
          {title}
        </motion.h1>
      )}

      {/* Journey Type Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mb-6 text-center"
      >
        <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm">
          {type === 'department' ? 'Department Journey' : 'Brand Journey'}
        </span>
      </motion.div>

      {/* Desktop: Horizontal Layout with Milestones */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="relative min-w-max px-4">
          {/* Timeline line with animation */}
          <motion.div 
            className="absolute top-24 left-4 right-4 h-0.5 bg-gray-300"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left' }}
          />

          {/* Milestones Grid */}
          <motion.div 
            className="grid gap-8" 
            style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(200px, 1fr))` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {milestones.map((milestone, index) => (
              <motion.div 
                key={index} 
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05, duration: 0.4 }}
              >
                {/* Connection line to milestone node */}
                <div className="flex flex-col items-center">
                  {/* Milestone card */}
                  <div className="mb-4 w-full">
                    <Milestone
                      milestone={milestone}
                      isProjected={milestone.isProjected}
                    />
                  </div>

                  {/* Milestone node on timeline */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 bg-white z-10 ${
                      milestone.isProjected
                        ? 'border-gray-400 border-dashed'
                        : 'border-gray-700'
                    }`}
                  />

                  {/* Visual connection line from card to node */}
                  <div className="absolute top-full w-0.5 h-4 bg-gray-300" style={{ top: 'calc(100% - 2rem)' }} />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Date range labels */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="flex justify-between mt-4 text-sm text-gray-600"
          >
            <span>{startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            <span>{endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </motion.div>
        </div>
      </div>

      {/* Mobile: Vertical Layout */}
      <motion.div 
        className="md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="relative pl-8">
          {/* Timeline line with animation */}
          <motion.div 
            className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeInOut' }}
            style={{ transformOrigin: 'top' }}
          />

          {/* Milestones */}
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <motion.div 
                key={index} 
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
              >
                {/* Milestone node */}
                <div
                  className={`absolute -left-[26px] top-4 w-4 h-4 rounded-full border-2 bg-white ${
                    milestone.isProjected
                      ? 'border-gray-400 border-dashed'
                      : 'border-gray-700'
                  }`}
                />

                {/* Milestone card */}
                <Milestone
                  milestone={milestone}
                  isProjected={milestone.isProjected}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-8 flex justify-center gap-6 text-sm text-gray-600"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-gray-700 bg-white" />
          <span>Realized Data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-dashed bg-white" />
          <span>Projected Data</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
