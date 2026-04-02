'use client'

import { Milestone as MilestoneType, DepartmentMetrics, BrandMetrics } from '@/lib/types'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface MilestoneProps {
  milestone: MilestoneType
  isProjected: boolean
  onClick?: () => void
}

function isDepartmentMetrics(metrics: DepartmentMetrics | BrandMetrics): metrics is DepartmentMetrics {
  return 'brandCount' in metrics
}

export function Milestone({ milestone, isProjected, onClick }: MilestoneProps) {
  const [isHovered, setIsHovered] = useState(false)
  const metrics = milestone.metrics
  const isDept = isDepartmentMetrics(metrics)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      className={`p-4 rounded-lg border-2 ${
        isProjected
          ? 'border-gray-300 border-dashed bg-gray-50'
          : 'border-gray-600 bg-white'
      } cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Date */}
      <div className="text-sm font-medium text-gray-700 mb-3">
        {format(milestone.date, 'MMMM yyyy')}
        {isProjected && (
          <span className="ml-2 text-xs text-gray-500 italic">(Projected)</span>
        )}
      </div>

      {/* Label */}
      {milestone.label && (
        <div className="text-xs text-gray-600 mb-3">{milestone.label}</div>
      )}

      {/* Metrics Cards */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {/* Brand Count (only for department metrics) */}
        {isDept && (
          <motion.div 
            className="p-2 rounded"
            style={{ backgroundColor: '#f3f4f6' }}
            whileHover={{ backgroundColor: '#e5e7eb' }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xs text-gray-600">Brand Count</div>
            <div className="text-lg font-semibold text-gray-800">
              {metrics.brandCount}
            </div>
          </motion.div>
        )}

        {/* Outlet Count */}
        <motion.div 
          className="p-2 rounded"
          style={{ backgroundColor: '#f3f4f6' }}
          whileHover={{ backgroundColor: '#e5e7eb' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-gray-600">Outlet Count</div>
          <div className="text-lg font-semibold text-gray-800">
            {metrics.outletCount}
          </div>
        </motion.div>

        {/* Revenue Breakdown */}
        <motion.div 
          className="p-2 rounded"
          style={{ backgroundColor: '#f3f4f6' }}
          whileHover={{ backgroundColor: '#e5e7eb' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-gray-600 mb-1">Revenue</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">New:</span>
              <span className="font-medium text-gray-800">
                ₹{(metrics.revenue.new || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Renewal:</span>
              <span className="font-medium text-gray-800">
                ₹{(metrics.revenue.renewal || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-gray-300">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="font-semibold text-gray-900">
                ₹{(metrics.revenue.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* RPU (Revenue Per Unit) */}
        <motion.div 
          className="p-2 rounded"
          style={{ backgroundColor: '#e0f2fe' }}
          whileHover={{ backgroundColor: '#bae6fd' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-gray-600 mb-1">
            RPU {isDept ? '(per Brand)' : '(per Outlet)'}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">New:</span>
              <span className="font-medium text-gray-800">
                ₹{(metrics.rpu.new || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Renewal:</span>
              <span className="font-medium text-gray-800">
                ₹{(metrics.rpu.renewal || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-blue-300">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="font-semibold text-gray-900">
                ₹{(metrics.rpu.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hover detail display */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600"
        >
          Click for more details
        </motion.div>
      )}
    </motion.div>
  )
}
