'use client'

import { motion } from 'framer-motion'

interface EmptyStateProps {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ 
  title = 'No Data Available',
  message = 'There is no data to display. Please ensure CSV files are properly loaded.',
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
    >
      <div className="w-24 h-24 mb-6 text-gray-300">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 text-sm font-medium text-white bg-gray-700 rounded hover:bg-gray-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
      <div className="mt-8 text-sm text-gray-500">
        <p className="mb-2">Expected CSV files in /Data folder:</p>
        <ul className="text-left space-y-1 font-mono text-xs bg-gray-50 p-4 rounded border border-gray-200">
          <li>• Brand DATA CSV.csv</li>
          <li>• KAM Data CSV.csv</li>
          <li>• Price Data CSV.csv</li>
        </ul>
      </div>
    </motion.div>
  )
}
