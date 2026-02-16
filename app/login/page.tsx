'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { signIn, loading } = useAuth()

  // Clean any corrupted input data on component mount
  useEffect(() => {
    const cleanInputs = () => {
      const emailInput = document.getElementById('email') as HTMLInputElement
      const passwordInput = document.getElementById('password') as HTMLInputElement
      
      if (emailInput && emailInput.value) {
        const cleanValue = emailInput.value.replace(/[^\w@.\-\s]/g, '')
        if (emailInput.value !== cleanValue) {
          emailInput.value = cleanValue
          setEmail(cleanValue)
        }
      }
      
      if (passwordInput && passwordInput.value) {
        const cleanValue = passwordInput.value.replace(/[^\w@.\-\s!@#$%^&*()]/g, '')
        if (passwordInput.value !== cleanValue) {
          passwordInput.value = cleanValue
          setPassword(cleanValue)
        }
      }
    }

    // Clean on mount and after a short delay to catch auto-fill
    cleanInputs()
    const timer = setTimeout(cleanInputs, 500)
    
    return () => clearTimeout(timer)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Clean inputs before validation
    const cleanEmail = email.replace(/[^\w@.\-\s]/g, '').trim()
    const cleanPassword = password.replace(/[^\w@.\-\s!@#$%^&*()]/g, '')

    // Validate inputs
    if (!cleanEmail) {
      setError('Email is required')
      return
    }

    if (!cleanPassword) {
      setError('Password is required')
      return
    }

    try {
      console.log('Attempting login with:', { email: cleanEmail })
      
      const result = await signIn(cleanEmail, cleanPassword)

      if (result.error) {
        console.error('Login error:', result.error)
        setError(result.error)
        return
      }

      console.log('✅ Login successful, redirecting to dashboard')
      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected login error:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  // Clean input as user types
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^\w@.\-\s]/g, '')
    setEmail(cleanValue)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^\w@.\-\s!@#$%^&*()]/g, '')
    setPassword(cleanValue)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236B94E3' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Subtle Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-100/30 to-indigo-100/30 rounded-full blur-2xl"
        animate={{
          y: [0, -10, 0],
          x: [0, 5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-slate-100/30 to-blue-100/30 rounded-full blur-2xl"
        animate={{
          y: [0, 10, 0],
          x: [0, -8, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-32 left-1/3 w-40 h-40 bg-gradient-to-r from-indigo-100/20 to-blue-100/20 rounded-full blur-2xl"
        animate={{
          y: [0, -15, 0],
          x: [0, 12, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full"
        >
          <div className="glass-morphism rounded-2xl p-8 shadow-xl backdrop-blur-sm border border-white/20">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center mb-8"
            >
              <motion.div
                className="mx-auto w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 shadow-lg border border-gray-200"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 10px 25px rgba(107, 148, 227, 0.2)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                <img 
                  src="/petpooja-logo.png" 
                  alt="KAM Logo" 
                  className="w-12 h-12 rounded-lg object-contain"
                  onError={(e) => {
                    // Fallback to SVG if PNG fails to load
                    e.currentTarget.src = '/petpooja-logo.svg';
                    e.currentTarget.onerror = () => {
                      // Final fallback to original design
                      e.currentTarget.style.display = 'none';
                      const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (nextSibling) {
                        nextSibling.style.display = 'block';
                      }
                    };
                  }}
                />
                <LogIn className="w-8 h-8 text-primary-600 hidden" />
              </motion.div>
              <h1 className="text-2xl font-bold text-secondary-800 mb-2">KAM HUB</h1>
              <p className="text-secondary-600">Welcome back! Please sign in to continue</p>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="input-3d w-full pl-12 pr-4 py-3 text-secondary-800 placeholder-secondary-400 focus:border-primary-500"
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    className="input-3d w-full pl-12 pr-12 py-3 text-secondary-800 placeholder-secondary-400 focus:border-primary-500"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 text-base font-semibold"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </motion.button>

              {/* Forgot Password Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="text-center"
              >
                <Link
                  href="/forgot-password"
                  className="text-primary-600 hover:text-primary-700 transition-colors text-sm font-medium"
                >
                  Forgot your password?
                </Link>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-8 text-center"
            >
              <p className="text-secondary-500 text-sm">
                Secure access to your KAM dashboard
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}