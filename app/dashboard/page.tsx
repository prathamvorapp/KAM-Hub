'use client'

import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import Leaderboard from '@/components/Leaderboard'

export default function DashboardPage() {
  const { userProfile } = useAuth()

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="max-w-4xl mx-auto">
        {userProfile && (
          <Leaderboard currentUserEmail={userProfile.email} />
        )}
      </div>
    </DashboardLayout>
  )
}