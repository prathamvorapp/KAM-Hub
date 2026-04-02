'use client'

import { Milestone as MilestoneType, DepartmentMetrics, BrandMetrics } from '@/lib/di-types'
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

// Format large rupee amounts: ₹1.85Cr, ₹9.13L, ₹8,750
function fmt(n: number): string {
  const v = n || 0
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(2)}L`
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// RPU values are smaller — just format with commas
function fmtRpu(n: number): string {
  const v = n || 0
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
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
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"
          whileHover={{ backgroundColor: '#d1fae5' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Revenue</div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">New</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {fmt(metrics.revenue.new)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Renewal</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {fmt(metrics.revenue.renewal)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200">
              <span className="text-xs font-bold text-emerald-800">Total</span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">
                {fmt(metrics.revenue.total)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* RPU */}
        <motion.div
          className="p-3 rounded-lg bg-blue-50 border border-blue-100"
          whileHover={{ backgroundColor: '#dbeafe' }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
            RPU {isDept ? '/ Brand' : '/ Outlet'}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">New</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {fmtRpu(metrics.rpu.new)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Renewal</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {fmtRpu(metrics.rpu.renewal)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-blue-200">
              <span className="text-xs font-bold text-blue-800">Total</span>
              <span className="text-sm font-bold text-blue-700 tabular-nums">
                {fmtRpu(metrics.rpu.total)}
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
