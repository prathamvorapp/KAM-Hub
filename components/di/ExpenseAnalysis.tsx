'use client'

import { useMemo } from 'react'
import { BrandWithKAM } from '@/lib/di-types'

interface ExpenseRecord {
  date: string
  kam: string
  total: number
}

interface ExpenseAnalysisProps {
  expenseRecords: ExpenseRecord[]
  brands: BrandWithKAM[]
  selectedKAM: string
  minOutlets: number
  maxOutlets: number
}

interface MonthlyExpense {
  month: string
  total: number
  count: number
}

interface KAMExpense {
  kam: string
  total: number
  count: number
  avgPerExpense: number
}

function getLatestKAM(brand: BrandWithKAM): string | null {
  if (!brand.kam_assignment) return null
  
  const kam = brand.kam_assignment
  
  if (kam.kam_name_6 && kam.kam_name_6.trim()) return kam.kam_name_6.trim()
  if (kam.kam_name_5 && kam.kam_name_5.trim()) return kam.kam_name_5.trim()
  if (kam.kam_name_4 && kam.kam_name_4.trim()) return kam.kam_name_4.trim()
  if (kam.kam_name_3 && kam.kam_name_3.trim()) return kam.kam_name_3.trim()
  if (kam.kam_name_2 && kam.kam_name_2.trim()) return kam.kam_name_2.trim()
  if (kam.kam_name_1 && kam.kam_name_1.trim()) return kam.kam_name_1.trim()
  
  return null
}

export function ExpenseAnalysis({
  expenseRecords,
  brands,
  selectedKAM,
  minOutlets,
  maxOutlets
}: ExpenseAnalysisProps) {
  
  // Filter expense records based on selected KAM
  const filteredExpenses = useMemo(() => {
    if (selectedKAM === 'all') return expenseRecords
    
    if (selectedKAM === 'Unassigned') {
      // For unassigned, we can't match expenses since they have KAM names
      return []
    }
    
    return expenseRecords.filter(exp => exp.kam === selectedKAM)
  }, [expenseRecords, selectedKAM])
  
  // Calculate monthly expenses
  const monthlyExpenses = useMemo(() => {
    const monthMap = new Map<string, { total: number; count: number }>()
    
    filteredExpenses.forEach(exp => {
      // Parse date (DD-MM-YYYY format)
      const [day, month, year] = exp.date.split('-')
      const monthKey = `${year}-${month}` // YYYY-MM format for sorting
      
      const current = monthMap.get(monthKey) || { total: 0, count: 0 }
      current.total += exp.total
      current.count += 1
      monthMap.set(monthKey, current)
    })
    
    // Convert to array and sort by month
    const months: MonthlyExpense[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
    
    return months
  }, [filteredExpenses])
  
  // Calculate KAM-wise expenses
  const kamExpenses = useMemo(() => {
    const kamMap = new Map<string, { total: number; count: number }>()
    
    filteredExpenses.forEach(exp => {
      const current = kamMap.get(exp.kam) || { total: 0, count: 0 }
      current.total += exp.total
      current.count += 1
      kamMap.set(exp.kam, current)
    })
    
    // Convert to array and sort by total expense (descending)
    const kams: KAMExpense[] = Array.from(kamMap.entries())
      .map(([kam, data]) => ({
        kam,
        total: data.total,
        count: data.count,
        avgPerExpense: data.total / data.count
      }))
      .sort((a, b) => b.total - a.total)
    
    return kams
  }, [filteredExpenses])
  
  // Calculate totals
  const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.total, 0)
  const totalTransactions = filteredExpenses.length
  const avgExpensePerTransaction = totalTransactions > 0 ? totalExpense / totalTransactions : 0
  const uniqueKAMs = new Set(filteredExpenses.map(exp => exp.kam)).size
  
  // Format month for display
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Expense</div>
          <div className="text-2xl font-bold text-red-600">
            ₹{(totalExpense / 100000).toFixed(2)}L
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {totalTransactions.toLocaleString()} transactions
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Avg per Transaction</div>
          <div className="text-2xl font-bold text-orange-600">
            ₹{avgExpensePerTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Active KAMs</div>
          <div className="text-2xl font-bold text-blue-600">
            {uniqueKAMs}
          </div>
          <div className="text-xs text-gray-500 mt-1">with expenses</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Time Period</div>
          <div className="text-2xl font-bold text-purple-600">
            {monthlyExpenses.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">months</div>
        </div>
      </div>
      
      {/* Monthly Expense Analysis */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Expense Trend</h2>
          <p className="text-sm text-gray-500 mt-1">
            Expense breakdown by month
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Expense
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyExpenses.map((monthData, index) => {
                const prevMonth = index > 0 ? monthlyExpenses[index - 1] : null
                const change = prevMonth 
                  ? ((monthData.total - prevMonth.total) / prevMonth.total) * 100 
                  : 0
                
                return (
                  <tr key={monthData.month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMonth(monthData.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                      ₹{monthData.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {monthData.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ₹{(monthData.total / monthData.count).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {prevMonth && (
                        <span className={`inline-flex items-center ${
                          change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                  ₹{totalExpense.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {totalTransactions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  ₹{avgExpensePerTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* KAM-wise Expense Analysis */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">KAM-wise Expense Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">
            Expense breakdown by Key Account Manager
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KAM Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Expense
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per Transaction
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kamExpenses.map((kamData, index) => {
                const percentOfTotal = (kamData.total / totalExpense) * 100
                
                return (
                  <tr key={kamData.kam} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-bold ${
                          index < 3 ? 'text-yellow-600' : 
                          index < 10 ? 'text-blue-600' : 
                          'text-gray-900'
                        }`}>
                          #{index + 1}
                        </span>
                        {index === 0 && <span className="ml-2">🥇</span>}
                        {index === 1 && <span className="ml-2">🥈</span>}
                        {index === 2 && <span className="ml-2">🥉</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {kamData.kam}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                      ₹{kamData.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {kamData.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ₹{kamData.avgPerExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-900 font-medium w-12 text-right">
                          {percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
