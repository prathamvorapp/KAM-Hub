'use client'

import { useState } from 'react'
import { X, Heart, AlertTriangle, CheckCircle, Check } from 'lucide-react'

interface HealthCheckModalProps {
  isOpen: boolean
  onClose: () => void
  brand: {
    brandName: string
    kamName: string
    zone: string
  }
  onSubmit: (data: {
    brand_name: string
    health_status: string
    brand_nature: string
    remarks?: string
  }) => Promise<void>
  isSubmitting: boolean
}

const HEALTH_STATUS_OPTIONS = [
  { value: 'Green', label: 'Green', color: 'bg-green-500', description: 'Excellent health' },
  { value: 'Amber', label: 'Amber', color: 'bg-amber-500', description: 'Good health with minor concerns' },
  { value: 'Orange', label: 'Orange', color: 'bg-orange-500', description: 'Moderate issues requiring attention' },
  { value: 'Red', label: 'Red', color: 'bg-red-500', description: 'Critical issues requiring immediate action' },
  { value: 'Not Connected', label: 'Not Connected', color: 'bg-gray-500', description: 'Unable to establish contact' },
  { value: 'Dead', label: 'Dead', color: 'bg-gray-800', description: 'Account is inactive/closed' },
]

const BRAND_NATURE_OPTIONS = [
  { value: 'Active', label: 'Active', description: 'Regular engagement and activity' },
  { value: 'Hyper Active', label: 'Hyper Active', description: 'Very high engagement and activity' },
  { value: 'Inactive', label: 'Inactive', description: 'Low or no recent activity' },
]

export default function HealthCheckModal({ 
  isOpen, 
  onClose, 
  brand, 
  onSubmit, 
  isSubmitting 
}: HealthCheckModalProps) {
  const [healthStatus, setHealthStatus] = useState('')
  const [brandNature, setBrandNature] = useState('')
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!healthStatus) {
      newErrors.healthStatus = 'Health status is required'
    }

    if (!brandNature) {
      newErrors.brandNature = 'Brand nature is required'
    }

    if ((healthStatus === 'Orange' || healthStatus === 'Red') && !remarks.trim()) {
      newErrors.remarks = 'Remarks are required for Orange or Red health status'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit({
        brand_name: brand.brandName,
        health_status: healthStatus,
        brand_nature: brandNature,
        remarks: remarks.trim() || undefined,
      })
      
      // Reset form
      setHealthStatus('')
      setBrandNature('')
      setRemarks('')
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error submitting health assessment:', error)
    }
  }

  const handleClose = () => {
    setHealthStatus('')
    setBrandNature('')
    setRemarks('')
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const requiresRemarks = healthStatus === 'Orange' || healthStatus === 'Red'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-red-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Health Check Assessment</h2>
              <p className="text-white/70 text-sm">Monthly brand health evaluation</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Brand Info */}
        <div className="p-6 border-b border-white/20">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Brand Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-white/60">Brand Name:</span>
                <p className="text-white font-medium">{brand.brandName}</p>
              </div>
              <div>
                <span className="text-white/60">KAM:</span>
                <p className="text-white font-medium">{brand.kamName}</p>
              </div>
              <div>
                <span className="text-white/60">Zone:</span>
                <p className="text-white font-medium">{brand.zone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Health Status */}
          <div>
            <label className="block text-white font-medium mb-3">
              Health Status <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HEALTH_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setHealthStatus(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    healthStatus === option.value
                      ? 'border-rose-400 bg-rose-500/20 shadow-lg ring-2 ring-rose-400/50'
                      : 'border-gray-400 bg-white/5 hover:bg-white/15 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-4 h-4 rounded-full ${option.color} ${
                      healthStatus === option.value ? 'ring-2 ring-white/50' : ''
                    }`} />
                    <span className={`font-medium text-sm ${
                      healthStatus === option.value ? 'text-white' : 'text-white/90'
                    }`}>{option.label}</span>
                    {healthStatus === option.value && (
                      <Check className="w-4 h-4 text-white ml-auto" />
                    )}
                  </div>
                  <p className={`text-xs ${
                    healthStatus === option.value ? 'text-white/80' : 'text-white/60'
                  }`}>{option.description}</p>
                </button>
              ))}
            </div>
            {errors.healthStatus && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {errors.healthStatus}
              </p>
            )}
          </div>

          {/* Brand Nature */}
          <div>
            <label className="block text-white font-medium mb-3">
              Brand Nature <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {BRAND_NATURE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBrandNature(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    brandNature === option.value
                      ? 'border-blue-400 bg-blue-500/20 shadow-lg ring-2 ring-blue-400/50'
                      : 'border-gray-400 bg-white/5 hover:bg-white/15 hover:border-gray-300'
                  }`}
                >
                  <div className={`font-medium text-sm mb-1 flex items-center justify-between ${
                    brandNature === option.value ? 'text-white' : 'text-white/90'
                  }`}>
                    <span>{option.label}</span>
                    {brandNature === option.value && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <p className={`text-xs ${
                    brandNature === option.value ? 'text-white/80' : 'text-white/60'
                  }`}>{option.description}</p>
                </button>
              ))}
            </div>
            {errors.brandNature && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {errors.brandNature}
              </p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-white font-medium mb-2">
              Remarks {requiresRemarks && <span className="text-red-400">*</span>}
              {requiresRemarks && (
                <span className="text-red-400 text-sm font-normal ml-2">
                  (Required for Orange/Red status)
                </span>
              )}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={requiresRemarks ? "Please provide details about the issues..." : "Optional remarks about the brand's health..."}
              rows={4}
              className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none ${
                errors.remarks ? 'border-red-400' : 'border-white/20'
              }`}
            />
            {errors.remarks && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {errors.remarks}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}