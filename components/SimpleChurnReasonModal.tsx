'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Mail } from 'lucide-react'
import { ALL_CHURN_REASONS } from '@/lib/constants/churnReasons'

interface SimpleChurnReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (reason: string, remarks: string, mailSentConfirmation?: boolean) => void
  currentReason?: string
  currentRemarks?: string
  rid: string
  restaurantName: string
}

// Use centralized constants
const CHURN_REASONS = [...ALL_CHURN_REASONS]

export default function SimpleChurnReasonModal({
  isOpen,
  onClose,
  onSelect,
  currentReason,
  currentRemarks,
  rid,
  restaurantName
}: SimpleChurnReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState(currentReason || '')
  const [remarks, setRemarks] = useState(currentRemarks || '')
  const [mailSentConfirmation, setMailSentConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(currentReason || '')
      setRemarks(currentRemarks || '')
      setMailSentConfirmation(false)
    }
  }, [isOpen, currentReason, currentRemarks])

  const handleSave = async () => {
    if (!selectedReason) {
      alert('Please select a churn reason')
      return
    }

    // For "I don't know" reason, require mail confirmation
    if (selectedReason === "I don't know" && !mailSentConfirmation) {
      alert('Please confirm that mail has been sent for "I don\'t know" reason')
      return
    }

    setIsSubmitting(true)
    try {
      await onSelect(selectedReason, remarks, mailSentConfirmation)
      onClose()
    } catch (error) {
      console.error('Error saving churn reason:', error)
      alert('Failed to save churn reason. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getReasonColor = (reason: string) => {
    const lowerReason = reason.toLowerCase()
    if (lowerReason.includes("i don't know")) return 'bg-gray-100 hover:bg-gray-200 text-gray-800'
    if (lowerReason.includes('kam needs')) return 'bg-orange-100 hover:bg-orange-200 text-orange-800'
    if (lowerReason.includes('active')) return 'bg-blue-100 hover:bg-blue-200 text-blue-800'
    if (lowerReason.includes('ownership')) return 'bg-purple-100 hover:bg-purple-200 text-purple-800'
    if (lowerReason.includes('permanently closed')) return 'bg-red-100 hover:bg-red-200 text-red-800'
    if (lowerReason.includes('overdue')) return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
    if (lowerReason.includes('switched')) return 'bg-pink-100 hover:bg-pink-200 text-pink-800'
    if (lowerReason.includes('temporarily closed')) return 'bg-amber-100 hover:bg-amber-200 text-amber-800'
    return 'bg-gray-100 hover:bg-gray-200 text-gray-800'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Churn Reason</h2>
            <p className="text-sm text-gray-600 mt-1">
              RID: {rid} • {restaurantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Current Reason Display */}
          {currentReason && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Current Churn Reason:</h3>
              <p className="text-blue-800">{currentReason}</p>
              {currentRemarks && (
                <div className="mt-2">
                  <h4 className="font-medium text-blue-900">Current Remarks:</h4>
                  <p className="text-blue-700 text-sm">{currentRemarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Churn Reason Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Churn Reason:
            </label>
            <div className="space-y-2">
              {CHURN_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  disabled={isSubmitting}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${getReasonColor(reason)} ${
                    selectedReason === reason ? 'ring-2 ring-blue-500 shadow-md' : ''
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{reason}</span>
                    {selectedReason === reason && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional):
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any additional notes or comments..."
              rows={3}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
            />
          </div>

          {/* Mail Sent Confirmation for "I don't know" */}
          {selectedReason === "I don't know" && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  id="simple-mail-sent-confirmation"
                  name="simple_mail_sent_confirmation"
                  type="checkbox"
                  checked={mailSentConfirmation}
                  onChange={(e) => setMailSentConfirmation(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    I have sent a mail <span className="text-red-600">*</span>
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Required when selecting "I don't know" as the churn reason
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                isSubmitting || 
                !selectedReason ||
                (selectedReason === "I don't know" && !mailSentConfirmation)
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}