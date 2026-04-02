'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useBrands } from '@/lib/data-context'

export function Navigation() {
  const brands = useBrands()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Filter brands based on search term
  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brands
    
    const term = searchTerm.toLowerCase()
    return brands.filter(brand => {
      const brandName = brand.kam_assignment?.brand_name?.toLowerCase() || ''
      const email = brand.email.toLowerCase()
      const restaurantId = brand.restaurant_id.toLowerCase()
      
      return brandName.includes(term) || 
             email.includes(term) || 
             restaurantId.includes(term)
    })
  }, [brands, searchTerm])

  return (
    <nav className="bg-gray-800 text-gray-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link 
              href="/" 
              className="text-xl font-semibold text-gray-100 hover:text-gray-300 transition-colors"
            >
              Brand Journey Dashboard
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {/* Department Journey Link */}
            <Link
              href="/dashboard/key-accounts-department-journey"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Department Journey
            </Link>

            {/* Brand Insights Link */}
            <Link
              href="/dashboard/brand-insights"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Brand Insights
            </Link>

            {/* Outlet Potential Index Link */}
            <Link
              href="/dashboard/outlet-potential-index"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Outlet Potential
            </Link>

            {/* Brand Potential Index Link */}
            <Link
              href="/dashboard/brand-potential-index"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Brand Potential
            </Link>

            {/* Outlet Product Matrix Link */}
            <Link
              href="/dashboard/outlet-product-matrix"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Product Matrix
            </Link>

            {/* Brand Product Matrix Link */}
            <Link
              href="/dashboard/brand-product-matrix"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Brand Matrix
            </Link>

            {/* Firsty Link */}
            <Link
              href="/dashboard/ai-analytics"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Firsty
            </Link>

            {/* Zeta Link */}
            <Link
              href="/dashboard/ai-analytics-dynamic"
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Zeta
            </Link>

            {/* Brand Journey Search/Select */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2"
              >
                <span>Brand Journeys</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-700 rounded-md shadow-lg z-50">
                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-600">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder-gray-400"
                    />
                  </div>

                  {/* Brand List */}
                  <div className="max-h-96 overflow-y-auto">
                    {filteredBrands.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        No brands found
                      </div>
                    ) : (
                      filteredBrands.map((brand) => {
                        const brandName = brand.kam_assignment?.brand_name || brand.email
                        const brandId = brand.restaurant_id
                        
                        return (
                          <Link
                            key={brandId}
                            href={`/dashboard/brand-journey/${brandId}`}
                            onClick={() => {
                              setIsDropdownOpen(false)
                              setSearchTerm('')
                            }}
                            className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border-b border-gray-600 last:border-b-0"
                          >
                            <div className="font-medium">{brandName}</div>
                            <div className="text-xs text-gray-400 mt-1">{brand.email}</div>
                          </Link>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  )
}
