import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BrandJourneyPage from './page'
import * as DataContext from '@/lib/data-context'
import * as NextNavigation from 'next/navigation'
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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}))

describe('BrandJourneyPage', () => {
  const mockBrands: BrandWithKAM[] = [
    {
      restaurant_id: 'brand-123',
      email: 'brand@example.com',
      POS_Subscription_status: 'Active',
      POS_Subscription_creation: new Date(2025, 2, 1),
      POS_Subscription_expiry: null,
      kam_assignment: {
        brand_uid: 'uid-1',
        brand_name: 'Test Brand',
        email: 'brand@example.com',
        assign_date_1: new Date(2025, 3, 15),
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

  it('renders for valid brand_id', () => {
    vi.mocked(NextNavigation.useParams).mockReturnValue({ brand_id: 'brand-123' })
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

    render(<BrandJourneyPage />)

    // Check that the brand journey title is rendered
    expect(screen.getByText('Brand Journey: Test Brand')).toBeInTheDocument()

    // Check that brand journey type is indicated
    expect(screen.getByText('Brand Journey')).toBeInTheDocument()
  })

  it('handles 404 for invalid brand_id', () => {
    vi.mocked(NextNavigation.useParams).mockReturnValue({ brand_id: 'invalid-brand' })
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

    render(<BrandJourneyPage />)

    // Check that 404 message is displayed
    expect(screen.getByText('Brand Not Found')).toBeInTheDocument()
    expect(screen.getByText(/The brand with ID "invalid-brand" could not be found/)).toBeInTheDocument()

    // Check that back link is present
    expect(screen.getByText('Back to Department Journey')).toBeInTheDocument()
  })
})
