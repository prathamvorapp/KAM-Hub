import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import KeyAccountsDepartmentJourneyPage from './page'
import * as DataContext from '@/lib/data-context'
import { BrandWithKAM, PriceRecord } from '@/lib/types'

// Mock the data context
vi.mock('@/lib/data-context', async () => {
  const actual = await vi.importActual('@/lib/data-context')
  return {
    ...actual,
    useBrands: vi.fn(),
    usePrices: vi.fn(),
    useDataContext: vi.fn(),
  }
})

describe('KeyAccountsDepartmentJourneyPage', () => {
  it('renders with correct date range (April 2025 to March 2027)', () => {
    const mockBrands: BrandWithKAM[] = [
      {
        restaurant_id: 'test-1',
        email: 'test@example.com',
        POS_Subscription_status: 'Active',
        POS_Subscription_creation: new Date(2025, 2, 1),
        POS_Subscription_expiry: null,
        kam_assignment: {
          brand_uid: 'uid-1',
          brand_name: 'Test Brand',
          email: 'test@example.com',
          assign_date_1: new Date(2025, 3, 1),
          kam_name_1: 'Test KAM',
          assign_date_2: null,
          kam_name_2: '',
        },
        outlets: [],
      } as BrandWithKAM,
    ]

    const mockPrices: PriceRecord[] = [
      { service_product_name: 'POS_Subscription', price: 1000 },
    ]

    vi.mocked(DataContext.useBrands).mockReturnValue(mockBrands)
    vi.mocked(DataContext.usePrices).mockReturnValue(mockPrices)
    vi.mocked(DataContext.useDataContext).mockReturnValue({
      brands: mockBrands,
      prices: mockPrices,
      isLoading: false,
      error: null,
      setBrands: vi.fn(),
      setPrices: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
    })

    render(<KeyAccountsDepartmentJourneyPage />)

    // Check that the title is rendered
    expect(screen.getByText('Key Accounts Department Journey')).toBeInTheDocument()

    // Check that department journey type is indicated
    expect(screen.getByText('Department Journey')).toBeInTheDocument()

    // Check that date range labels are present (April 2025 and March 2027)
    expect(screen.getByText(/Apr 2025/)).toBeInTheDocument()
    expect(screen.getByText(/Mar 2027/)).toBeInTheDocument()
  })
})
