'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  TrendingDown, 
  MapPin, 
  Presentation, 
  Heart, 
  Ticket,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ThumbsUp,
  ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamName?: string;
  permissions: string[];
}

interface SidebarProps {
  userProfile: User | null;
}

const allModules = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, color: 'from-blue-500 to-cyan-500', roles: ['agent', 'team_lead', 'admin'] },
  { name: 'Churn Data', href: '/dashboard/churn', icon: TrendingDown, color: 'from-red-500 to-pink-500', roles: ['agent', 'team_lead', 'admin'] },
  { name: 'Visits', href: '/dashboard/visits', icon: MapPin, color: 'from-green-500 to-emerald-500', roles: ['agent', 'team_lead', 'admin'] },
  { name: 'Approvals', href: '/dashboard/approvals', icon: ThumbsUp, color: 'from-yellow-500 to-orange-500', roles: ['team_lead'] },
  { name: 'Demos', href: '/dashboard/demos', icon: Presentation, color: 'from-purple-500 to-violet-500', roles: ['agent', 'team_lead', 'admin'] },
  { name: 'Health Check-ups', href: '/dashboard/health-checks', icon: Heart, color: 'from-rose-500 to-red-500', roles: ['agent', 'team_lead', 'admin'] },
  { name: 'MOM Tracker', href: '/dashboard/mom-tracker', icon: Ticket, color: 'from-orange-500 to-amber-500', roles: ['agent', 'team_lead', 'admin'] },
]

export default function Sidebar({ userProfile }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const pathname = usePathname()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const visibleModules = useMemo(() => {

    if (!userProfile) {

      return [];
    }
    
    // Map database roles to lowercase for comparison
    const roleMapping: { [key: string]: string } = {
      'Team Lead': 'team_lead',
      'Agent': 'agent', 
      'Admin': 'admin'
    };
    
    const normalizedRole = roleMapping[userProfile.role] || userProfile.role?.toLowerCase();

    
    const filteredModules = allModules.filter(module => module.roles.includes(normalizedRole));

    
    return filteredModules;
  }, [userProfile]);

  // Handle scroll events to show/hide scroll-to-top button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const containerVariants = {
    expanded: { width: 256 },
    collapsed: { width: 64 }
  }

  const itemVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -20 }
  }

  return (
    <motion.div
      variants={containerVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white border-r border-gray-200 h-screen sticky top-16 shadow-sm"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="font-semibold text-secondary-800"
              >
                Navigation
              </motion.h2>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-300 border border-gray-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-secondary-600" /> : <ChevronLeft className="w-4 h-4 text-secondary-600" />}
            </motion.div>
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-hidden relative sidebar-scroll-container">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto sidebar-scroll pr-2"
          >
            <ul className="space-y-2">
              {visibleModules.map((module, index) => {
              const isActive = pathname === module.href
              const Icon = module.icon

              return (
                <motion.li
                  key={module.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <Link href={module.href}>
                    <motion.div
                      className={`sidebar-item group relative p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 border-l-4 border-primary-500 shadow-sm sketched-border-active'
                          : 'hover:bg-gray-50 sketched-border'
                      }`}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      title={isCollapsed ? module.name : undefined}
                    >
                      {/* Icon with gradient background */}
                      <motion.div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-r ${module.color} flex items-center justify-center shadow-sm`}
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </motion.div>

                      {/* Text */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={itemVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            className={`font-medium ml-3 ${
                              isActive ? 'text-primary-700' : 'text-secondary-700 group-hover:text-secondary-800'
                            }`}
                          >
                            {module.name}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute right-2 w-2 h-2 bg-primary-500 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      {/* Hover effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />
                    </motion.div>
                  </Link>
                </motion.li>
              )
            })}
            </ul>
          </div>
          
          {/* Scroll to top button */}
          <AnimatePresence>
            {showScrollTop && !isCollapsed && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToTop}
                className="absolute bottom-4 right-6 w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Scroll to top"
              >
                <ChevronUp className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="text-center"
              >
                <p className="text-secondary-500 text-xs">KAM HUB v2.0</p>
                <p className="text-secondary-400 text-xs mt-1">Enhanced UI</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}