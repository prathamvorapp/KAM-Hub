'use client'

import { useEffect, useState } from 'react'
import { useDataContext } from '@/lib/data-context'
import { ErrorModal } from './ErrorModal'
import { EmptyState } from './EmptyState'
import { WarningBanner } from './WarningBanner'

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { setBrands, setBrandRecords, setKAMRecords, setPrices, setPriceData, setRevenueRecords, setChurnRecords, setExpenseRecords, setIsLoading, setError, setWarnings, isLoading, error, warnings, brands } = useDataContext()
  const [errorFileName, setErrorFileName] = useState<string | undefined>()

  useEffect(() => {
    async function loadData() {
      console.log('🔄 DataLoader: Starting data load - v3 with Revenue.csv')
      setIsLoading(true)
      setError(null)
      setWarnings([])
      setErrorFileName(undefined)

      try {
        const response = await fetch('/api/data')
        
        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load data')
          setErrorFileName(errorData.fileName)
          setIsLoading(false)
          return
        }

        const data = await response.json()
        
        // Convert date strings back to Date objects
        const deserializedBrands = data.brands.map((brand: any) => {
          const deserializedBrand: any = {
            ...brand,
            POS_Subscription_creation: brand.POS_Subscription_creation ? new Date(brand.POS_Subscription_creation) : null,
            POS_Subscription_expiry: brand.POS_Subscription_expiry ? new Date(brand.POS_Subscription_expiry) : null,
            kam_assignment: brand.kam_assignment ? {
              ...brand.kam_assignment,
              assign_date_1: brand.kam_assignment.assign_date_1 ? new Date(brand.kam_assignment.assign_date_1) : null,
              assign_date_2: brand.kam_assignment.assign_date_2 ? new Date(brand.kam_assignment.assign_date_2) : null,
            } : null,
            outlets: brand.outlets?.map((outlet: any) => ({
              ...outlet,
              pos_creation: outlet.pos_creation ? new Date(outlet.pos_creation) : null,
              pos_expiry: outlet.pos_expiry ? new Date(outlet.pos_expiry) : null,
            })) || [],
          }
          
          // Convert all subscription creation/expiry dates
          Object.keys(brand).forEach(key => {
            if (key.endsWith('_creation') || key.endsWith('_expiry')) {
              deserializedBrand[key] = brand[key] ? new Date(brand[key]) : null
            }
          })
          
          return deserializedBrand
        })
        
        // Deserialize revenue records
        const deserializedRevenue = (data.revenueRecords || []).map((record: any) => ({
          ...record,
          date: record.date ? new Date(record.date) : new Date(),
        }))
        
        console.log(`📊 Loaded ${deserializedRevenue.length} revenue records`)
        
        // Debug: Check if dates are properly deserialized
        if (deserializedBrands.length > 0 && deserializedBrands[0].outlets?.length > 0) {
          const firstOutlet = deserializedBrands[0].outlets[0]
          console.log('Date deserialization check:', {
            pos_creation: firstOutlet.pos_creation,
            isDate: firstOutlet.pos_creation instanceof Date,
            pos_expiry: firstOutlet.pos_expiry,
            isDateExpiry: firstOutlet.pos_expiry instanceof Date
          })
        }
        
        if (deserializedRevenue.length > 0) {
          console.log('Revenue record sample:', {
            date: deserializedRevenue[0].date,
            isDate: deserializedRevenue[0].date instanceof Date,
            product: deserializedRevenue[0].product_or_service_name,
            amount: deserializedRevenue[0].amount,
            restaurant_id: deserializedRevenue[0].restaurant_id
          })
        }
        
        setBrands(deserializedBrands)
        setBrandRecords(data.brandRecords || [])
        setKAMRecords(data.kamRecords || [])
        setPrices(data.prices)
        setPriceData(data.priceData || [])
        setRevenueRecords(deserializedRevenue)
        setChurnRecords(data.churnRecords || [])
        setExpenseRecords(data.expenseRecords || [])
        setWarnings(data.warnings || [])
        setIsLoading(false)
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to load data: ${err.message}`)
        } else {
          setError('An unknown error occurred while loading data')
        }
        setIsLoading(false)
      }
    }

    loadData()
  }, [setBrands, setBrandRecords, setKAMRecords, setPrices, setPriceData, setRevenueRecords, setChurnRecords, setExpenseRecords, setIsLoading, setError, setWarnings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative inline-block">
            {/* Outer spinning ring */}
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-700"></div>
            {/* Inner pulsing circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="animate-pulse h-8 w-8 bg-gray-700 rounded-full opacity-20"></div>
            </div>
          </div>
          <p className="text-gray-700 font-medium mt-6 text-lg">Loading CSV Data</p>
          <p className="text-gray-500 text-sm mt-2">Parsing brand, KAM, and price data...</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorModal
          isOpen={true}
          title="Error Loading Data"
          message={error}
          fileName={errorFileName}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!isLoading && !error && brands.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          title="No Data Available"
          message="No brand data was found. Please ensure CSV files are properly formatted and contain valid data."
          actionLabel="Reload"
          onAction={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <>
      {warnings.length > 0 && <WarningBanner warnings={warnings} />}
      {children}
    </>
  )
}
