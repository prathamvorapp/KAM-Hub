'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, Menu, X, Bell, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FollowUpNotifications } from '../FollowUpNotifications'

interface User {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

interface NavbarProps {
  userProfile?: User | null
}

export default function Navbar({ userProfile }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const getRoleBadgeColor = (role: string) => {
    const normalizedRole = role?.toLowerCase().replace(' ', '_');
    switch (normalizedRole) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200'
      case 'team_lead': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'agent': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-morphism border-b border-gray-200 sticky top-0 z-50 bg-white/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center space-x-3">
              <img 
                src="/petpooja-logo.png" 
                alt="KAM Logo" 
                className="w-8 h-8 rounded-lg object-contain"
                onError={(e) => {
                  // Fallback to SVG if PNG fails to load
                  e.currentTarget.src = '/petpooja-logo.svg';
                  e.currentTarget.onerror = () => {
                    // Final fallback to original design
                    e.currentTarget.style.display = 'none';
                    const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (nextSibling) {
                      nextSibling.style.display = 'flex';
                    }
                  };
                }}
              />
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg items-center justify-center hidden">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <h1 className="text-xl font-bold text-secondary-800">KAM HUB</h1>
            </div>
          </motion.div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Follow-Up Notifications */}
            <FollowUpNotifications 
              onReminderClick={(rid) => {
                // Navigate to churn page and open the specific RID modal
                router.push(`/dashboard/churn?rid=${rid}`);
              }}
            />

            {/* User Profile */}
            {userProfile ? (
              <motion.div
                className="flex items-center space-x-4 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200"
                whileHover={{ scale: 1.02, backgroundColor: "rgb(249 250 251)" }}
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center"
                    whileHover={{ rotate: 5 }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="text-sm">
                    <p className="font-medium text-secondary-800">{userProfile.full_name || userProfile.email}</p>
                    <motion.span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(userProfile.role)}`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {userProfile.role?.toUpperCase() || 'USER'}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center space-x-4 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200">
                <div className="w-10 h-10 bg-gray-300 rounded-xl animate-pulse"></div>
                <div className="text-sm">
                  <div className="h-4 bg-gray-300 rounded w-24 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Settings */}
            <motion.button
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 border border-gray-200"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <Settings className="w-5 h-5 text-secondary-600" />
            </motion.button>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-300 border border-red-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </motion.button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 border border-gray-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isMenuOpen ? <X className="w-6 h-6 text-secondary-600" /> : <Menu className="w-6 h-6 text-secondary-600" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-4 space-y-4">
              {userProfile ? (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <User className="w-8 h-8 text-secondary-600" />
                  <div>
                    <p className="font-medium text-secondary-800">{userProfile.full_name || userProfile.email}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(userProfile.role)}`}>
                      {userProfile.role?.toUpperCase() || 'USER'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-8 h-8 bg-gray-300 rounded-xl animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-300 rounded w-24 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              )}
              <motion.button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-300 border border-red-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="text-red-600 font-medium">Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}