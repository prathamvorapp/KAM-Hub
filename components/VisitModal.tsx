'use client'

import { useState, useEffect } from 'react'
import { isValidDate } from '@/utils/dateUtils'
import { X, Calendar, MapPin, User, Building, Clock, FileText } from 'lucide-react'
import { UserProfile } from '@/lib/types'

interface VisitModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (visitData: any) => Promise<void>
  initialData?: any
  userProfile: UserProfile
  availableBrands: Brand[]
}

interface Brand {
  "Brand ID": string
  "Brand Name": string
  "KAM Name": string
  "Brand State": string
  "Res Count": string
  "Brand Type": string
  "Cuisine": string
  Status: string
  visit_count: number
  available: boolean
}

export default function VisitModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  userProfile,
  availableBrands
}: VisitModalProps) {
  const [formData, setFormData] = useState({
    brand_id: '',
    brand_name: '',
    scheduled_date: '',
    visit_type: 'On-site',
    purpose: '',
    outcome: '',
    next_steps: '',
    duration_minutes: '',
    attendees: '',
    notes: '',
    visit_status: 'Scheduled'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        brand_id: initialData.brand_id || '',
        brand_name: initialData.brand_name || '',
        scheduled_date: initialData.scheduled_date && isValidDate(initialData.scheduled_date) 
          ? initialData.scheduled_date.split('T')[0] 
          : '',
        visit_type: initialData.visit_type || 'On-site',
        purpose: initialData.purpose || '',
        outcome: initialData.outcome || '',
        next_steps: initialData.next_steps || '',
        duration_minutes: initialData.duration_minutes || '',
        attendees: initialData.attendees || '',
        notes: initialData.notes || '',
        visit_status: initialData.visit_status || 'Scheduled'
      })
    } else {
      // Reset form for new visit
      setFormData({
        brand_id: '',
        brand_name: '',
        scheduled_date: '',
        visit_type: 'On-site',
        purpose: '',
        outcome: '',
        next_steps: '',
        duration_minutes: '',
        attendees: '',
        notes: '',
        visit_status: 'Scheduled'
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBrandSelect = (e: any) => {
    const selectedBrandId = e.target.value
    const selectedBrand = availableBrands.find(brand => brand["Brand ID"] === selectedBrandId)
    
    if (selectedBrand) {
      setFormData(prev => ({
        ...prev,
        brand_id: selectedBrand["Brand ID"],
        brand_name: selectedBrand["Brand Name"]
      }))
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    
    if (!formData.brand_id || !formData.scheduled_date) {
      alert('Please select a brand and scheduled date')
      return
    }

    try {
      setIsSubmitting(true)
      
      const visitData = {
        "Brand ID": formData.brand_id,
        "Brand Name": formData.brand_name,
        "Agent ID": userProfile.user_id,
        "Agent Name": userProfile.user_name,
        "Team Lead ID": "", // Will be set by backend based on team
        "Scheduled Date": formData.scheduled_date,
        "Visit Date": formData.visit_status === 'Visit Complete' ? new Date().toISOString().split('T')[0] : '',
        "Visit Type": formData.visit_type,
        "Visit Status": formData.visit_status,
        "Purpose": formData.purpose,
        "Outcome": formData.outcome,
        "Next Steps": formData.next_steps,
        "Duration Minutes": formData.duration_minutes,
        "Attendees": formData.attendees,
        "Notes": formData.notes,
        "MoM Shared": "No",
        "Approval Status": "Not Required",
        "Visit Year": isValidDate(formData.scheduled_date) 
          ? new Date(formData.scheduled_date).getFullYear()
          : new Date().getFullYear()
      }
      
      await onSave(visitData)
    } catch (error) {
      console.error('Error saving visit:', error)
      alert('Failed to save visit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isAgent = userProfile.role === 'agent'
  const isEditing = !!initialData
  const isReadOnly = isEditing && userProfile.role !== 'admin' && 
    (userProfile.role !== 'agent' || initialData?.agent_name !== userProfile.user_name)

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 modal-overlay">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700 modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Visit Details' : 'Schedule New Visit'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isAgent && !isEditing && 'Schedule a visit to one of your assigned brands'}
              {isEditing && `Visit ID: ${initialData?.visit_id || 'N/A'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Brand Selection - Only for agents creating new visits */}
          {isAgent && !isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Brand <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleBrandSelect}
                  required
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a brand...</option>
                  {availableBrands.filter(brand => brand.available).map((brand) => (
                    <option key={brand["Brand ID"]} value={brand["Brand ID"]}>
                      {brand["Brand Name"]} (Visits: {brand.visit_count}/2)
                    </option>
                  ))}
                </select>
              </div>
              {availableBrands.filter(brand => brand.available).length === 0 && (
                <p className="text-yellow-400 text-sm mt-1">
                  No brands available for visit. All assigned brands have reached the 2-visit limit for this year.
                </p>
              )}
            </div>
          )}

          {/* Brand Name - Read-only for editing */}
          {(isEditing || !isAgent) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brand Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="brand-name-readonly"
                  name="brand_name"
                  type="text"
                  value={formData.brand_name}
                  readOnly
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300"
                  autoComplete="organization"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scheduled Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="scheduled-date"
                  name="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  required
                  readOnly={isReadOnly}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Visit Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Visit Type
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="visit_type"
                  value={formData.visit_type}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:text-gray-300"
                >
                  <option value="On-site">On-site</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Phone">Phone</option>
                </select>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purpose
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              rows={2}
              readOnly={isReadOnly}
              placeholder="What is the purpose of this visit?"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
            />
          </div>

          {/* Outcome - Only show if visit is completed */}
          {(formData.visit_status === 'Visit Complete' || formData.visit_status === 'Visit Done') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Outcome
              </label>
              <textarea
                name="outcome"
                value={formData.outcome}
                onChange={handleChange}
                rows={2}
                readOnly={isReadOnly}
                placeholder="What was the outcome of the visit?"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
              />
            </div>
          )}

          {/* Next Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Next Steps
            </label>
            <textarea
              name="next_steps"
              value={formData.next_steps}
              onChange={handleChange}
              rows={2}
              readOnly={isReadOnly}
              placeholder="What are the next steps?"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  placeholder="60"
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
                />
              </div>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attendees
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="attendees"
                  value={formData.attendees}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  placeholder="Who will attend?"
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                readOnly={isReadOnly}
                placeholder="Additional notes..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:text-gray-300"
              />
            </div>
          </div>

          {/* Visit Status - Only for editing */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Visit Status
              </label>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  formData.visit_status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                  formData.visit_status === 'Visit Complete' ? 'bg-green-100 text-green-800' :
                  formData.visit_status === 'Visit Done' ? 'bg-purple-100 text-purple-800' :
                  formData.visit_status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {formData.visit_status}
                </span>
                {initialData?.mom_shared === 'Yes' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    MoM Shared
                  </span>
                )}
                {initialData?.approval_status && initialData.approval_status !== 'Not Required' && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    initialData.approval_status === 'Approved' ? 'bg-green-100 text-green-800' :
                    initialData.approval_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    initialData.approval_status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {initialData.approval_status}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting || (isAgent && !isEditing && availableBrands.filter(b => b.available).length === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Visit' : 'Schedule Visit'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 font-medium"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}