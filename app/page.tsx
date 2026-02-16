'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user data exists in localStorage
      const userData = localStorage.getItem('user_data')
      
      if (userData) {
        try {
          const user = JSON.parse(userData)
          if (user && user.email) {
            router.push('/dashboard')
            return
          }
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('user_data')
        }
      }
      
      router.push('/login')
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Loading...</p>
      </div>
    </div>
  )
}
