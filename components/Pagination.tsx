import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  onPageChange: (page: number) => void
  hasNext: boolean
  hasPrev: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onPageChange,
  hasNext,
  hasPrev
}: PaginationProps) {
  const startRecord = (currentPage - 1) * recordsPerPage + 1
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords)

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (totalPages <= 1) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl shadow-sm"
    >
      {/* Mobile pagination */}
      <div className="flex flex-1 justify-between sm:hidden">
        <motion.button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </motion.button>
        <motion.button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </motion.button>
      </div>
      
      {/* Desktop pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm text-secondary-600">
            Showing <span className="font-medium text-secondary-800">{startRecord}</span> to{' '}
            <span className="font-medium text-secondary-800">{endRecord}</span> of{' '}
            <span className="font-medium text-secondary-800">{totalRecords}</span> results
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <nav className="flex items-center space-x-2" aria-label="Pagination">
            <motion.button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrev}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            
            <div className="flex items-center space-x-1">
              {getPageNumbers().map((page, index) => (
                <motion.button
                  key={index}
                  onClick={() => typeof page === 'number' && onPageChange(page)}
                  disabled={page === '...'}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === currentPage
                      ? 'bg-primary-600 text-white shadow-sm'
                      : page === '...'
                      ? 'text-secondary-400 cursor-default'
                      : 'bg-gray-100 hover:bg-gray-200 text-secondary-700 border border-gray-200'
                  }`}
                  whileHover={page !== '...' && page !== currentPage ? { scale: 1.05 } : {}}
                  whileTap={page !== '...' && page !== currentPage ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {page}
                </motion.button>
              ))}
            </div>
            
            <motion.button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNext}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </nav>
        </motion.div>
      </div>
    </motion.div>
  )
}