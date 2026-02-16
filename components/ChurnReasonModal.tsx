'use client'

import { useState, useEffect } from 'react'
import { X, Phone, Clock, Mail, CheckCircle } from 'lucide-react'
import { formatDateTimeSafely } from '@/utils/dateUtils'
import { ALL_CHURN_REASONS } from '@/lib/constants/churnReasons'

interface ChurnReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (reason: string, remarks: string, mailSentConfirmation?: boolean) => void
  currentReason?: string
  currentRemarks?: string
  rid: string
  restaurantName: string
}

interface CallAttempt {
  call_number: number
  timestamp: string
  churn_reason: string
  call_response: string
  notes?: string
}

interface FollowUpData {
  rid: string
  call_attempts: CallAttempt[]
  current_call: number
  is_active: boolean
  mail_sent: boolean
  next_reminder_time?: string
  created_at: string
  updated_at: string
}

// Use centralized constants
const CHURN_REASONS = [...ALL_CHURN_REASONS]

export default function ChurnReasonModal({
  isOpen,
  onClose,
  onSelect,
  currentReason,
  currentRemarks,
  rid,
  restaurantName
}: ChurnReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState(currentReason || '')
  const [remarks, setRemarks] = useState(currentRemarks || '')
  const [mailSentConfirmation, setMailSentConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Follow-up system state
  const [followUpData, setFollowUpData] = useState<FollowUpData | null>(null)
  const [loadingFollowUp, setLoadingFollowUp] = useState(true)
  const [callNotes, setCallNotes] = useState('')
  const [callResponse, setCallResponse] = useState('')

  // Load follow-up data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFollowUpData()
    }
  }, [isOpen, rid])

  // Force refresh follow-up data every 30 seconds when modal is open
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        loadFollowUpData()
      }, 30000) // Refresh every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Auto-set Connected for call 4+
  useEffect(() => {
    if (followUpData && followUpData.current_call >= 4 && !callResponse) {
      setCallResponse('Connected')
    }
  }, [followUpData, callResponse])

  const loadFollowUpData = async () => {
    try {
      setLoadingFollowUp(true)
      
      // Use Convex instead of backend API
      const { convexAPI } = await import('@/lib/convex-api')
      const { useAuth } = await import('@/contexts/AuthContext')
      
      // Get user email for role-based filtering
      const userEmail = typeof window !== 'undefined' ? 
        localStorage.getItem('user_email') || 
        sessionStorage.getItem('user_email') : null;
      
      const response = await convexAPI.getFollowUpStatus(rid, currentReason || '', userEmail || undefined)
      
      if (response.success && response.data) {
        const data = response.data
        // Use Convex data directly
        const followUpInfo: FollowUpData = {
          rid: rid,
          call_attempts: data.call_attempts || [],
          current_call: data.current_call || 1,
          is_active: data.is_active,
          mail_sent: data.mail_sent || false,
          next_reminder_time: data.next_reminder_time,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        }
        setFollowUpData(followUpInfo)
      }
    } catch (error) {
      console.error('Error loading follow-up data:', error)
    } finally {
      setLoadingFollowUp(false)
    }
  }

  const isFollowUpActive = (churnReason: string) => {
    if (!churnReason || churnReason.trim() === '') return true
    const reasonLower = churnReason.toLowerCase().trim()
    return reasonLower === "i don't know" || reasonLower === "kam needs to respond"
  }

  const handleReasonClick = (reason: string) => {
    setSelectedReason(reason)
    
    // If reason becomes finalized, follow-up should be deactivated
    if (!isFollowUpActive(reason) && followUpData) {
      setFollowUpData({
        ...followUpData,
        is_active: false
      })
    }
  }

  const handleCallComplete = async () => {
    if (!followUpData) return

    // For call 4+, automatically set response to Connected
    const actualCallResponse = followUpData.current_call >= 4 ? 'Connected' : callResponse
    
    if (!actualCallResponse) return

    // For non-connected calls, we don't need churn reason (but call 4+ is always connected)
    const currentChurnReason = actualCallResponse === 'Connected' ? (selectedReason || currentReason || '') : ''
    const isActive = actualCallResponse === 'Connected' ? isFollowUpActive(currentChurnReason) : true // Non-connected calls keep follow-up active
    
    // Check mail confirmation requirements based on new logic
    const needsMailConfirmation = 
      (actualCallResponse === 'Connected' && 
       followUpData.current_call >= 3 && 
       (selectedReason === "I don't know" || selectedReason === "KAM needs to respond" || selectedReason === ""))
    
    if (needsMailConfirmation && !mailSentConfirmation) {
      alert('After 3rd call with follow-up churn reason, you must confirm that mail has been sent.')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Record the call attempt
      const callAttempt: CallAttempt = {
        call_number: followUpData.current_call,
        timestamp: new Date().toISOString(),
        churn_reason: currentChurnReason,
        call_response: actualCallResponse,
        notes: callNotes.trim() || undefined
      }

      // Calculate next reminder time based on new call-based logic
      let nextReminderTime: string | undefined
      
      if (actualCallResponse === 'Connected' && 
          (selectedReason === "I don't know" || selectedReason === "KAM needs to respond" || selectedReason === "")) {
        
        const now = new Date()
        const connectedFollowUpCalls = followUpData.call_attempts.filter(attempt => 
          attempt.call_response === 'Connected' && 
          (attempt.churn_reason === "I don't know" || attempt.churn_reason === "KAM needs to respond" || attempt.churn_reason === "")
        ).length + 1 // +1 for current call
        
        if (connectedFollowUpCalls === 1) {
          // After 1st connected call with follow-up reason: 2 hours
          nextReminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
        } else if (connectedFollowUpCalls === 2) {
          // After 2nd connected call with follow-up reason: 48 hours
          nextReminderTime = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
        } else if (connectedFollowUpCalls >= 3) {
          // After 3rd+ connected call: inactive permanently if mail sent
          nextReminderTime = undefined
        }
      } else if (actualCallResponse !== 'Connected') {
        // Non-connected calls keep follow-up active immediately
        nextReminderTime = new Date().toISOString()
      } else {
        // Connected call with finalized churn reason - no more follow-up
        nextReminderTime = undefined
      }

      // Determine if follow-up should remain active based on new logic
      const isFollowUpStillActive = actualCallResponse !== 'Connected' || 
        (actualCallResponse === 'Connected' && 
         (selectedReason === "I don't know" || selectedReason === "KAM needs to respond" || selectedReason === "") &&
         !mailSentConfirmation) // If mail sent after 3rd+ call, becomes inactive
      
      const updatedFollowUp: FollowUpData = {
        ...followUpData,
        call_attempts: [...followUpData.call_attempts, callAttempt],
        current_call: followUpData.current_call + 1, // Always increment after recording a call
        is_active: isFollowUpStillActive, // Keep active if not connected or if connected with active churn reason
        mail_sent: mailSentConfirmation || followUpData.mail_sent, // Update mail sent status
        next_reminder_time: nextReminderTime,
        updated_at: new Date().toISOString()
      }

      // Save follow-up data using Convex
      const { convexAPI } = await import('@/lib/convex-api')
      const response = await convexAPI.recordCallAttempt({
        rid,
        call_response: actualCallResponse,
        notes: callNotes,
        churn_reason: currentChurnReason
      })

      if (!response.success) {
        throw new Error('Failed to save call data')
      }

      // Update churn reason if connected and changed
      if (actualCallResponse === 'Connected' && selectedReason && selectedReason !== currentReason) {
        await onSelect(selectedReason, remarks, mailSentConfirmation)
      }

      // Fetch updated follow-up data from Convex to ensure UI is in sync
      const statusResponse = await convexAPI.getFollowUpStatus(rid, currentChurnReason)
      if (statusResponse.success && statusResponse.data) {
        const updatedStatus = statusResponse.data
        setFollowUpData({
          rid: rid,
          call_attempts: updatedStatus.call_attempts || [],
          current_call: updatedStatus.current_call || 1,
          is_active: updatedStatus.is_active || false,
          mail_sent: updatedStatus.mail_sent || false,
          next_reminder_time: updatedStatus.next_reminder_time,
          created_at: updatedStatus.created_at || new Date().toISOString(),
          updated_at: updatedStatus.updated_at || new Date().toISOString()
        })
      } else {
        // Fallback to local state if Convex fetch fails
        setFollowUpData(updatedFollowUp)
      }

      setCallNotes('')
      setCallResponse('')
      setSelectedReason('')
      setMailSentConfirmation(false)
      
      // Close the modal after successful call completion
      onClose()
      
    } catch (error) {
      console.error('Error completing call:', error)
      alert('Failed to record call. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMailSent = async () => {
    if (!followUpData) return

    try {
      setIsSubmitting(true)
      
      // Update mail sent status using Convex (we'll handle this through churn reason update)
      // For now, we'll update the local state and let the churn reason update handle the backend
      const updatedFollowUp: FollowUpData = {
        ...followUpData,
        mail_sent: true,
        is_active: true, // Still active but no more notifications
        next_reminder_time: undefined, // No more reminders
        updated_at: new Date().toISOString()
      }

      // Update local state immediately
      setFollowUpData(updatedFollowUp)

      setFollowUpData(updatedFollowUp)
      
    } catch (error) {
      console.error('Error marking mail sent:', error)
      alert('Failed to mark mail sent. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    if (!selectedReason) {
      alert('Please select a churn reason first')
      return
    }

    if (selectedReason === "I don't know" && !mailSentConfirmation) {
      alert('Please confirm that you have sent a mail before saving')
      return
    }

    setIsSubmitting(true)
    try {
      await onSelect(selectedReason, remarks, mailSentConfirmation)
      onClose()
    } catch (error) {
      console.error('Failed to update churn reason:', error)
      alert('Failed to update. Please try again.')
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

  const formatDateTime = (dateString: string) => {
    return formatDateTimeSafely(dateString, 'Invalid date')
  }

  const getTimeUntilReminder = (reminderTime: string) => {
    const now = new Date()
    const reminder = new Date(reminderTime)
    const diff = reminder.getTime() - now.getTime()
    
    if (diff <= 0) return 'Reminder due now'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m remaining`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 modal-overlay">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-secondary-800">Follow-Up Call Management</h2>
            <p className="text-sm text-secondary-600 mt-1">
              RID: {rid} • {restaurantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loadingFollowUp ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-secondary-600">Loading follow-up data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Follow-Up Status */}
              {followUpData && (
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-primary-800">Follow-Up Status</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={loadFollowUpData}
                        className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                        disabled={loadingFollowUp}
                      >
                        🔄 Refresh
                      </button>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${followUpData.is_active ? 'bg-success-500' : 'bg-error-500'}`}></div>
                        <span className="text-sm font-medium text-secondary-700">
                          {followUpData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-primary-700">Current Call:</span>
                      <div className="text-primary-600">#{followUpData.current_call}</div>
                    </div>
                    <div>
                      <span className="font-medium text-primary-700">Completed Calls:</span>
                      <div className="text-primary-600">{followUpData.call_attempts.length}</div>
                    </div>
                    <div>
                      <span className="font-medium text-primary-700">Mail Sent:</span>
                      <div className="text-primary-600">{followUpData.mail_sent ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {followUpData.next_reminder_time && (
                    <div className="mt-3 p-3 bg-yellow-100 rounded border-l-4 border-yellow-500">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Next Reminder:</span>
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        {formatDateTime(followUpData.next_reminder_time)} ({getTimeUntilReminder(followUpData.next_reminder_time)})
                      </div>
                    </div>
                  )}
                  
                  {/* Debug Information */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                      <div className="font-medium text-gray-700 mb-1">Debug Info:</div>
                      <div className="text-gray-600">
                        Current Time: {new Date().toISOString()}<br/>
                        Reminder Time: {followUpData.next_reminder_time || 'None'}<br/>
                        Is Active: {followUpData.is_active ? 'true' : 'false'}<br/>
                        Updated At: {followUpData.updated_at}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Call History */}
              {followUpData && followUpData.call_attempts.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Call History</h3>
                  <div className="space-y-3">
                    {followUpData.call_attempts.map((attempt, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Call #{attempt.call_number}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              attempt.call_response === 'Connected' ? 'bg-green-100 text-green-800' :
                              attempt.call_response === 'Busy' ? 'bg-yellow-100 text-yellow-800' :
                              attempt.call_response === 'Requested Callback' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {attempt.call_response}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(attempt.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          {attempt.call_response === 'Connected' && (
                            <div><strong>Churn Reason:</strong> {attempt.churn_reason || 'Not specified'}</div>
                          )}
                          {attempt.notes && <div><strong>Notes:</strong> {attempt.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Call Section */}
              <div className="bg-white border-2 border-blue-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-4">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Call #{followUpData?.current_call || 1} - Record Response
                  </h3>
                </div>

                {/* Step 1: Call Response */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Step 1: What was the call response?
                  </label>
                  
                  {/* Show all options for calls 1-3, only Connected for call 4+ */}
                  {followUpData && followUpData.current_call >= 4 ? (
                    // Call 4+: Only Connected option
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-sm font-medium text-blue-800">
                          Call #{followUpData.current_call} - Customer must be connected
                        </span>
                      </div>
                      <button
                        onClick={() => setCallResponse('Connected')}
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                          callResponse === 'Connected'
                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                            : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-medium">Connected</span>
                          {callResponse === 'Connected' && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    </div>
                  ) : (
                    // Calls 1-3: All response options
                    <div className="grid grid-cols-2 gap-3">
                      {['Busy', 'Requested Callback', 'No Answer', 'Connected'].map((response) => (
                        <button
                          key={response}
                          onClick={() => setCallResponse(response)}
                          disabled={isSubmitting}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            callResponse === response
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <span className="font-medium">{response}</span>
                            {callResponse === response && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Churn Reason (only if Connected OR if Call 4+) */}
                {(callResponse === 'Connected' || (followUpData && followUpData.current_call >= 4)) && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <label className="block text-sm font-medium text-green-800 mb-3">
                      {followUpData && followUpData.current_call >= 4 
                        ? `Step 2: Call #${followUpData.current_call} - What was the churn reason?`
                        : 'Step 2: Customer was connected - What was the churn reason?'
                      }
                    </label>
                    <div className="space-y-2">
                      {CHURN_REASONS.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => handleReasonClick(reason)}
                          disabled={isSubmitting}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all ${getReasonColor(reason)} ${
                            selectedReason === reason ? 'ring-2 ring-green-500 shadow-md' : ''
                          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reason}</span>
                            {selectedReason === reason && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Call Notes (Optional)
                  </label>
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Add any notes about this call..."
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                  />
                </div>

                {/* Remarks */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any additional notes or comments..."
                    rows={2}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                  />
                </div>

                {/* Mail Sent Confirmation for "I don't know" when Connected */}
                {callResponse === 'Connected' && selectedReason === "I don't know" && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        id="mail-sent-confirmation-connected"
                        name="mail_sent_confirmation_connected"
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

                {/* Mail Sent Confirmation for 3rd+ call when NOT Connected */}
                {followUpData && followUpData.current_call >= 3 && callResponse && callResponse !== 'Connected' && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        id="mail-sent-confirmation-not-connected"
                        name="mail_sent_confirmation_not_connected"
                        type="checkbox"
                        checked={mailSentConfirmation}
                        onChange={(e) => setMailSentConfirmation(e.target.checked)}
                        disabled={isSubmitting}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          I have sent a mail <span className="text-red-600">*</span>
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          Required for 3rd call when customer is not connected - mail must be sent to customer
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCallComplete}
                    disabled={Boolean(
                      isSubmitting || 
                      (!callResponse && (!followUpData || followUpData.current_call < 4)) || // Call response required for calls 1-3
                      ((callResponse === 'Connected' || (followUpData && followUpData.current_call >= 4)) && !selectedReason) || // Churn reason required when connected or call 4+
                      (callResponse === 'Connected' && selectedReason === "I don't know" && !mailSentConfirmation) ||
                      (followUpData && followUpData.current_call >= 3 && followUpData.current_call < 4 && callResponse !== 'Connected' && !mailSentConfirmation) // Mail required for call 3 non-connected
                    )}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isSubmitting ? 'Recording...' : 'Complete Call'}
                  </button>

                  {/* Mail Sent Button (for 3rd+ call when connected) */}
                  {followUpData && followUpData.current_call >= 3 && (callResponse === 'Connected' || followUpData.current_call >= 4) && isFollowUpActive(selectedReason || currentReason || '') && !followUpData.mail_sent && (
                    <button
                      onClick={handleMailSent}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium flex items-center space-x-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Mark Mail Sent</span>
                    </button>
                  )}
                </div>

                {/* Follow-Up Status Message */}
                {(callResponse || (followUpData && followUpData.current_call >= 4)) && (
                  <div className="mt-4 p-3 rounded-lg">
                    {/* Call 4+ logic - always connected */}
                    {followUpData && followUpData.current_call >= 4 ? (
                      selectedReason ? (
                        isFollowUpActive(selectedReason) ? (
                          <div className="bg-green-50 border border-green-200 text-green-800">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Follow-up will remain active</span>
                            </div>
                            <p className="text-sm mt-1">
                              Call #{followUpData.current_call} - Customer connected, agent can mark mail sent to stop notifications
                            </p>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 text-red-800">
                            <div className="flex items-center space-x-2">
                              <X className="w-4 h-4" />
                              <span className="font-medium">Follow-up will be deactivated</span>
                            </div>
                            <p className="text-sm mt-1">
                              Churn reason is finalized - record will be removed from active follow-up
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">Please select churn reason</span>
                          </div>
                          <p className="text-sm mt-1">
                            Call #{followUpData.current_call} - Customer is connected, churn reason is required
                          </p>
                        </div>
                      )
                    ) : /* Calls 1-3 logic */ callResponse === 'Connected' && selectedReason ? (
                      isFollowUpActive(selectedReason) ? (
                        <div className="bg-green-50 border border-green-200 text-green-800">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Follow-up will remain active</span>
                          </div>
                          <p className="text-sm mt-1">
                            {followUpData?.current_call === 1 && 'Next reminder in 2 hours'}
                            {followUpData?.current_call === 2 && 'Next reminder in 48 hours'}
                            {followUpData?.current_call === 3 && 'Agent can mark mail sent to stop notifications'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 text-red-800">
                          <div className="flex items-center space-x-2">
                            <X className="w-4 h-4" />
                            <span className="font-medium">Follow-up will be deactivated</span>
                          </div>
                          <p className="text-sm mt-1">
                            Churn reason is finalized - record will be removed from active follow-up
                          </p>
                        </div>
                      )
                    ) : callResponse === 'Connected' ? (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Please select churn reason</span>
                        </div>
                        <p className="text-sm mt-1">
                          Customer was connected - churn reason is required to complete the call
                        </p>
                      </div>
                    ) : callResponse ? (
                      <div className="bg-orange-50 border border-orange-200 text-orange-800">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Call not connected</span>
                        </div>
                        <p className="text-sm mt-1">
                          {callResponse === 'Busy' && 'Customer was busy - will try again later'}
                          {callResponse === 'Requested Callback' && 'Customer requested callback - schedule follow-up'}
                          {callResponse === 'No Answer' && 'No answer - will try again later'}
                          {followUpData && followUpData.current_call >= 3 && !mailSentConfirmation && (
                            <span className="block mt-1 font-medium text-orange-900">
                              ⚠️ Mail confirmation required for 3rd+ call when not connected
                            </span>
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
