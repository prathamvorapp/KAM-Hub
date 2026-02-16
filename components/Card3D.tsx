import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Card3DProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  gradient?: string
}

function Card3D({
  children,
  className = '',
  hover = true,
  glow = false,
  gradient
}: Card3DProps) {
  const baseClasses = 'backdrop-blur-md rounded-2xl shadow-xl border border-white/20 transition-all duration-300'
  
  const backgroundClass = gradient 
    ? `bg-gradient-to-br ${gradient}` 
    : 'bg-white/10'

  return (
    <motion.div
      className={`${baseClasses} ${backgroundClass} ${className} ${
        glow ? 'glow-effect' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? {
        scale: 1.02,
        y: -5,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.15)'
      } : {}}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

export { Card3D }
export default Card3D