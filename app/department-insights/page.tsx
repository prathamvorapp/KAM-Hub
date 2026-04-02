'use client'

import { useMemo } from 'react'
import { useBrands, useRevenueRecords, useExpenseRecords, useDataContext } from '@/lib/di-data-context'
import { TimelineSkeleton } from '@/components/di/TimelineSkeleton'

// Date range: April 2025 – February 2026 (inclusive)
const START = new Date(2025, 3, 1)  // Apr 1 2025
const END   = new Date(2026, 2, 28) // Feb 28 2026

function formatCurrency(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function Home() {
  const brands         = useBrands()
  const revenueRecords = useRevenueRecords()
  const expenseRecords = useExpenseRecords()
  const { isLoading, error } = useDataContext()

  const stats = useMemo(() => {
    // Total unique brands
    const totalBrands = brands.length

    // Total outlets across all brands
    const totalOutlets = brands.reduce((sum, b) => sum + b.outlets.length, 0)

    // Total revenue Apr 2025 – Feb 2026
    const totalRevenue = revenueRecords
      .filter(r => r.date >= START && r.date <= END)
      .reduce((sum, r) => sum + r.amount, 0)

    // Total expense Apr 2025 – Feb 2026
    // ExpenseRecord.date is "DD-MM-YYYY"
    const totalExpense = expenseRecords
      .filter(r => {
        const parts = r.date.split('-')
        if (parts.length !== 3) return false
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        return d >= START && d <= END
      })
      .reduce((sum, r) => sum + r.total, 0)

    return { totalBrands, totalOutlets, totalRevenue, totalExpense }
  }, [brands, revenueRecords, expenseRecords])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <TimelineSkeleton />
      </main>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  const cards = [
    {
      label: 'No. of Brands',
      value: stats.totalBrands.toLocaleString('en-IN'),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: '🏷️',
    },
    {
      label: 'No. of Outlets',
      value: stats.totalOutlets.toLocaleString('en-IN'),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: '🏪',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '💰',
    },
    {
      label: 'Total Expense',
      value: formatCurrency(stats.totalExpense),
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '📉',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Brand Journey Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Apr 2025 – Feb 2026</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {cards.map(card => (
            <div
              key={card.label}
              className={`rounded-xl border ${card.border} ${card.bg} p-6 flex flex-col gap-2 shadow-sm`}
            >
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
              <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
