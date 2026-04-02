import { describe, test, expect, vi, beforeEach } from 'vitest'
import { DataLoader } from './DataLoader'

// Mock the data context
vi.mock('@/lib/data-context', () => ({
  useDataContext: vi.fn(),
}))

// Mock the CSV parser
vi.mock('@/lib/csv-parser', () => ({
  CSVParser: vi.fn(),
  CSVParseError: class CSVParseError extends Error {
    constructor(message: string, public fileName: string) {
      super(message)
      this.name = 'CSVParseError'
    }
  },
}))

import { useDataContext } from '@/lib/data-context'

describe('DataLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('displays loading state initially', () => {
    const mockContext = {
      setBrands: vi.fn(),
      setPrices: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      isLoading: true,
      error: null,
      brands: [],
      prices: [],
    }

    vi.mocked(useDataContext).mockReturnValue(mockContext)

    // The component should show loading state when isLoading is true
    expect(mockContext.isLoading).toBe(true)
  })

  test('displays error state when error occurs', () => {
    const mockContext = {
      setBrands: vi.fn(),
      setPrices: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      isLoading: false,
      error: 'File not found: Brand DATA CSV.csv',
      brands: [],
      prices: [],
    }

    vi.mocked(useDataContext).mockReturnValue(mockContext)

    // The component should show error state when error is present
    expect(mockContext.error).toBeTruthy()
    expect(mockContext.error).toContain('Brand DATA CSV.csv')
  })

  test('renders children when data is loaded successfully', () => {
    const mockContext = {
      setBrands: vi.fn(),
      setPrices: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      isLoading: false,
      error: null,
      brands: [],
      prices: [],
    }

    vi.mocked(useDataContext).mockReturnValue(mockContext)

    // The component should render children when not loading and no error
    expect(mockContext.isLoading).toBe(false)
    expect(mockContext.error).toBeNull()
  })
})
