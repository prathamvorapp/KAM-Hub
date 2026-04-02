'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBrands } from '@/lib/di-data-context'
import { Search, ChevronDown, TrendingUp } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Overview', href: '/department-insights' },
  { label: 'Dept. Journey', href: '/department-insights/key-accounts-department-journey' },
  { label: 'Brand Insights', href: '/department-insights/brand-insights' },
  { label: 'Outlet Potential', href: '/department-insights/outlet-potential-index' },
  { label: 'Brand Potential', href: '/department-insights/brand-potential-index' },
  { label: 'Outlet Matrix', href: '/department-insights/outlet-product-matrix' },
  { label: 'Brand Matrix', href: '/department-insights/brand-product-matrix' },
]

export function DeptInsightsSubNav() {
  const brands = useBrands()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

  const getLatestKAM = (brand: (typeof brands)[0]) => {
    const k = brand.kam_assignment
    if (!k) return null
    return k.kam_name_6?.trim() || k.kam_name_5?.trim() || k.kam_name_4?.trim() ||
      k.kam_name_3?.trim() || k.kam_name_2?.trim() || k.kam_name_1?.trim() || null
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm -mx-6 -mt-6 mb-6 px-6">
      <div className="flex items-center justify-between h-12">

        {/* Section label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:block">
            Dept. Insights
          </span>
          <span className="text-gray-300 hidden sm:block">|</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 mx-3">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                isActive(link.href)
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="ml-1.5 inline-block w-1 h-1 rounded-full bg-violet-500 align-middle" />
              )}
            </Link>
          ))}
        </nav>

        {/* Brand journey search */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
              isDropdownOpen
                ? 'bg-violet-50 border-violet-300 text-violet-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Brand Journey</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Search header */}
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">
                    {brands.length} brands
                  </span>
                  <span className="text-xs text-gray-400">Search to filter</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name, email or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Brand list */}
              <div className="max-h-72 overflow-y-auto">
                {filteredBrands.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Search className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No brands found</p>
                  </div>
                ) : (
                  filteredBrands.map((brand) => {
                    const brandName = brand.kam_assignment?.brand_name || brand.email
                    const kamName = getLatestKAM(brand)
                    const initial = brandName.charAt(0).toUpperCase()

                    return (
                      <Link
                        key={brand.restaurant_id}
                        href={`/department-insights/brand-journey/${brand.restaurant_id}`}
                        onClick={() => { setIsDropdownOpen(false); setSearchTerm('') }}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-b-0 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-violet-600">{initial}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-800 group-hover:text-violet-700 truncate">
                            {brandName}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {kamName ? `KAM: ${kamName}` : brand.email}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                          {brand.outlets.length}
                        </span>
                      </Link>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {filteredBrands.length > 0 && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-center">
                  <span className="text-xs text-gray-400">
                    {filteredBrands.length} result{filteredBrands.length !== 1 ? 's' : ''}
                    {searchTerm && ` for "${searchTerm}"`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
      )}
    </div>
  )
}
