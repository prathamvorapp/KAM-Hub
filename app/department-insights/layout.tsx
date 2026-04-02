'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { DataProvider } from '@/lib/di-data-context'
import { DataLoader } from '@/components/di/DataLoader'
import { DeptInsightsSubNav } from '@/components/di/DeptInsightsSubNav'

export default function DepartmentInsightsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (userProfile === null) {
      router.push('/login')
    }
  }, [userProfile, router])

  if (!userProfile) return null

  return (
    <DashboardLayout userProfile={userProfile}>
      <DataProvider>
        <DataLoader>
          <DeptInsightsSubNav />
          {children}
        </DataLoader>
      </DataProvider>
    </DashboardLayout>
  )
}
