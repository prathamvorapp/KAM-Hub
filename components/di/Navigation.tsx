'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBrands } from '@/lib/di-data-context'

const NAV_LINKS = [
  { label: 'Overview', href: '/department-insights' },
  { label: 'Dept. Journey', href: '/department-insights/key-accounts-department-journey' },
  { label: 'Brand Insights', href: '/department-insights/brand-insights' },
  { label: 'Outlet Potential', href: '/department-insights/outlet-potential-index' },
  { label: 'Brand Potential', href: '/department-insights/brand-potential-index' },
  { label: 'Outlet Matrix', href: '/department-insights/outlet-product-matrix' },
  { label: 'Brand Matrix', href: '/department-insights/brand-product-matrix' },
]

export function Navigation() {
  const brands = useBrands()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brands
    const term = searchTerm.toLowerCase()
    return brands.filter(brand => {
      const brandName = brand.kam_assignment?.brand_name?.toLowerCase() || ''
      return (
        brandName.includes(term) ||
        brand.email.toLowerCase().includes(term) ||
        brand.restaurant_id.toLowerCase().includes(term)
      )
    })
  }, [brands, searchTerm])

  const isActive = (href: string) => {
    if (href === '/department-insights') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 text-gray-100 shadow-lg border-b border-gray-700">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link
            href="/department-insights"
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors hidden sm:block">
              Dept. Insights
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive(link.href)
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: Brand Journeys dropdown + mobile toggle */}
          <div className="flex items-center gap-2">

            {/* Brand Journeys dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isDropdownOpen
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Brand Journeys</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-900 border-b border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {brands.length} brands loaded
                    </p>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name, email or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-gray-700 text-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Brand list */}
                  <div className="max-h-80 overflow-y-auto">
                    {filteredBrands.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-500">No brands found</p>
                      </div>
                    ) : (
                      filteredBrands.map((brand) => {
                        const brandName = brand.kam_assignment?.brand_name || brand.email
                        const kamName = brand.kam_assignment?.kam_name_6 ||
                          brand.kam_assignment?.kam_name_5 ||
                          brand.kam_assignment?.kam_name_4 ||
                          brand.kam_assignment?.kam_name_3 ||
                          brand.kam_assignment?.kam_name_2 ||
                          brand.kam_assignment?.kam_name_1 || null

                        return (
                          <Link
                            key={brand.restaurant_id}
                            href={`/department-insights/brand-journey/${brand.restaurant_id}`}
                            onClick={() => { setIsDropdownOpen(false); setSearchTerm('') }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-b-0 group"
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-violet-400">
                                {brandName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-200 group-hover:text-white truncate">{brandName}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {kamName ? `KAM: ${kamName}` : brand.email}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 flex-shrink-0">
                              {brand.outlets.length} outlet{brand.outlets.length !== 1 ? 's' : ''}
                            </div>
                          </Link>
                        )
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {filteredBrands.length > 0 && (
                    <div className="px-4 py-2 bg-gray-900 border-t border-gray-700">
                      <p className="text-xs text-gray-500 text-center">
                        {filteredBrands.length} result{filteredBrands.length !== 1 ? 's' : ''}
                        {searchTerm && ` for "${searchTerm}"`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back to main app */}
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-gray-700 hover:border-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Main App
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-700 bg-gray-900">
          <div className="px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors col-span-2 border border-gray-700 text-center mt-1"
            >
              ← Back to Main App
            </Link>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
      )}
    </nav>
  )
}
