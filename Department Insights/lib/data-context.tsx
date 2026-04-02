'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { BrandWithKAM, PriceRecord, RevenueRecord, BrandRecord, KAMRecord, ChurnRecord, PriceData, ExpenseRecord } from './types'

interface DataContextType {
  brands: BrandWithKAM[]
  brandRecords: BrandRecord[]
  kamRecords: KAMRecord[]
  prices: PriceRecord[]
  priceData: PriceData[]
  revenueRecords: RevenueRecord[]
  churnRecords: ChurnRecord[]
  expenseRecords: ExpenseRecord[]
  isLoading: boolean
  error: string | null
  warnings: string[]
  setBrands: (brands: BrandWithKAM[]) => void
  setBrandRecords: (records: BrandRecord[]) => void
  setKAMRecords: (records: KAMRecord[]) => void
  setPrices: (prices: PriceRecord[]) => void
  setPriceData: (prices: PriceData[]) => void
  setRevenueRecords: (records: RevenueRecord[]) => void
  setChurnRecords: (records: ChurnRecord[]) => void
  setExpenseRecords: (records: ExpenseRecord[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setWarnings: (warnings: string[]) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const [brands, setBrands] = useState<BrandWithKAM[]>([])
  const [brandRecords, setBrandRecords] = useState<BrandRecord[]>([])
  const [kamRecords, setKAMRecords] = useState<KAMRecord[]>([])
  const [prices, setPrices] = useState<PriceRecord[]>([])
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>([])
  const [churnRecords, setChurnRecords] = useState<ChurnRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  return (
    <DataContext.Provider
      value={{
        brands,
        brandRecords,
        kamRecords,
        prices,
        priceData,
        revenueRecords,
        churnRecords,
        expenseRecords,
        isLoading,
        error,
        warnings,
        setBrands,
        setBrandRecords,
        setKAMRecords,
        setPrices,
        setPriceData,
        setRevenueRecords,
        setChurnRecords,
        setExpenseRecords,
        setIsLoading,
        setError,
        setWarnings,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useBrands(): BrandWithKAM[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useBrands must be used within a DataProvider')
  }
  return context.brands
}

export function usePrices(): PriceRecord[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('usePrices must be used within a DataProvider')
  }
  return context.prices
}

export function useRevenueRecords(): RevenueRecord[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useRevenueRecords must be used within a DataProvider')
  }
  return context.revenueRecords
}

export function useDataContext(): DataContextType {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider')
  }
  return context
}

export function useChurnRecords(): ChurnRecord[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useChurnRecords must be used within a DataProvider')
  }
  return context.churnRecords
}

export function usePriceData(): PriceData[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('usePriceData must be used within a DataProvider')
  }
  return context.priceData
}

export function useExpenseRecords(): ExpenseRecord[] {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useExpenseRecords must be used within a DataProvider')
  }
  return context.expenseRecords
}
