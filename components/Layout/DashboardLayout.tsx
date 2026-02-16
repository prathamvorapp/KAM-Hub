'use client'

import { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import ApprovalNotifications from '../ApprovalNotifications'
import { motion } from 'framer-motion'

interface User {
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
  permissions: string[];
}

interface DashboardLayoutProps {
  children: ReactNode
  userProfile: User | null
}

export default function DashboardLayout({ children, userProfile }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Subtle animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-slate-100/20 to-blue-100/20 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [180, 90, 0],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <Navbar userProfile={userProfile} />
      {userProfile && (
        <ApprovalNotifications userEmail={userProfile.email} userRole={userProfile.role} />
      )}
      <div className="flex relative z-10">
        <Sidebar userProfile={userProfile} />
        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 p-6 overflow-auto bg-white/30 backdrop-blur-sm"
        >
          <motion.div
            className="page-transition"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </motion.main>
      </div>
    </div>
  )
}