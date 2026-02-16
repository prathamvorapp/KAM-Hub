'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import MOMOpenPointsTable from '@/components/MOMOpenPointsTable'
import { convexAPI } from '@/lib/convex-api'
import { Ticket, MessageSquare, Clock, CheckCircle, Calendar, User, Building, Filter, ArrowLeft, Eye, AlertTriangle, Download } from 'lucide-react'

interface OpenPoint {
  topic: string;
  description: string;
  ownership: string;
  owner_name: string;
  status: string;
  timeline: string;
  next_steps?: string;
  created_at: string;
  updated_at: string;
}

interface MOMRecord {
  _id: string;
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string | null;
  created_by: string;
  brand_name?: string | null;
  customer_name?: string | null;
  visit_id?: string | null;
  open_points?: OpenPoint[];
  created_at: string;
  updated_at: string;
  // Visit approval status fields
  visit_approval_status?: string | null;
  visit_rejection_remarks?: string | null;
  visit_rejected_by?: string | null;
  visit_rejected_at?: string | null;
  visit_resubmission_count?: number | null;
}

export default function TicketsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const visitId = searchParams.get('visit_id')
  const { user, userProfile, loading: authLoading } = useAuth()
  const [momRecords, setMomRecords] = useState<MOMRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedMOM, setSelectedMOM] = useState<MOMRecord | null>(null)
  const [visitDetails, setVisitDetails] = useState<any>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load MOM records
  const loadMOMRecords = async () => {
    if (!user?.email) return
    
    try {
      setLoading(true)
      
      console.log('🔍 Loading MOM records for user:', user.email);
      console.log('🎯 Looking for visit_id:', visitId);
      
      // If we have a specific visit_id, try multiple search strategies
      if (visitId) {
        // Strategy 1: Search by visit_id directly
        console.log('📋 Strategy 1: Searching by visit_id directly');
        let response = await convexAPI.getMOM({
          email: user.email,
          search: visitId,
        });
        
        let records = response.data?.data || [];
        console.log('📊 Strategy 1 results:', records.length, 'records found');
        
        // Strategy 2: If no results, get all MOMs and filter client-side
        if (records.length === 0) {
          console.log('📋 Strategy 2: Getting all MOMs and filtering client-side');
          response = await convexAPI.getMOM({
            email: user.email,
          });
          
          const allRecords = response.data?.data || [];
          console.log('📊 Total MOM records:', allRecords.length);
          
          // Filter by visit_id on client side
          records = allRecords.filter((mom: any) => {
            const matches = mom.visit_id === visitId || 
                           mom.title?.includes(visitId) ||
                           mom.description?.includes(visitId);
            if (matches) {
              console.log('✅ Found matching MOM:', mom.ticket_id, 'for visit:', visitId);
            }
            return matches;
          });
          
          console.log('📊 Strategy 2 results:', records.length, 'records found');
        }
        
        // Strategy 3: If still no results, also load visit details to get more context
        if (records.length === 0) {
          console.log('📋 Strategy 3: Loading visit details for context');
          try {
            const visitResponse = await convexAPI.getVisits({ 
              email: user.email, 
              search: visitId 
            });
            const visits = visitResponse.data?.page || [];
            const visit: any = visits.find((v: any) => v.visit_id === visitId);
            
            if (visit) {
              console.log('✅ Found visit details:', visit);
              setVisitDetails(visit);
              
              // Try searching by brand name as fallback
              if (visit.brand_name) {
                console.log('📋 Strategy 3b: Searching by brand name:', visit.brand_name);
                const brandResponse = await convexAPI.getMOM({
                  email: user.email,
                  search: visit.brand_name,
                });
                
                const brandRecords = brandResponse.data?.data || [];
                const visitMOMs = brandRecords.filter((mom: any) => 
                  mom.visit_id === visitId || 
                  mom.brand_name === visit.brand_name
                );
                
                if (visitMOMs.length > 0) {
                  records = visitMOMs;
                  console.log('📊 Strategy 3b results:', records.length, 'records found by brand');
                }
              }
            }
          } catch (visitError) {
            console.error('❌ Error loading visit details:', visitError);
          }
        }
        
        // Apply client-side approval status filter if needed
        if (approvalStatusFilter) {
          const filteredRecords = records.filter((mom: any) => 
            mom.visit_approval_status === approvalStatusFilter
          );
          setMomRecords(filteredRecords);
        } else {
          setMomRecords(records);
        }
        
        // Auto-select the first matching MOM
        if (records.length > 0) {
          const visitMOM: any = records.find((mom: any) => mom.visit_id === visitId) || records[0];
          setSelectedMOM(visitMOM);
          console.log('🎯 Selected MOM:', visitMOM.ticket_id);
        } else {
          console.log('⚠️ No MOM records found for visit:', visitId);
        }
        
      } else {
        // Normal search without visit_id
        const searchQuery = searchTerm || undefined;
        const response = await convexAPI.getMOM({
          email: user.email,
          search: searchQuery,
        });
        
        const records = response.data?.data || [];
        
        // Apply client-side status filter if needed
        let filteredRecords = records;
        if (statusFilter) {
          filteredRecords = filteredRecords.filter((mom: any) => mom.status === statusFilter);
        }
        
        // Apply client-side approval status filter if needed
        if (approvalStatusFilter) {
          filteredRecords = filteredRecords.filter((mom: any) => 
            mom.visit_approval_status === approvalStatusFilter
          );
        }
        
        setMomRecords(filteredRecords);
        console.log('📊 Normal search results:', filteredRecords.length, 'records found');
      }
      
    } catch (error) {
      console.error('❌ Failed to load MOM records:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load visit details for context
  const loadVisitDetails = async (visitId: string) => {
    try {
      console.log('🔍 Loading visit details for:', visitId);
      
      // Try multiple strategies to find the visit
      const response = await convexAPI.getVisits({ 
        email: user?.email || '', 
        search: visitId 
      });
      
      // Fix: getVisits returns { data: { page: [], isDone, continueCursor } }
      const visits = response.data?.page || [];
      console.log('📊 Found visits:', visits.length);
      
      // Look for exact match first
      let visit: any = visits.find((v: any) => v.visit_id === visitId);
      
      // If no exact match, try partial match
      if (!visit && visits.length > 0) {
        visit = visits.find((v: any) => v.visit_id?.includes(visitId) || visitId.includes(v.visit_id));
      }
      
      // If still no match, take the first visit (might be filtered by search)
      if (!visit && visits.length > 0) {
        visit = visits[0];
      }
      
      if (visit) {
        console.log('✅ Found visit details:', visit);
        setVisitDetails(visit);
      } else {
        console.log('⚠️ No visit details found for:', visitId);
      }
    } catch (error) {
      console.error('❌ Failed to load visit details:', error);
    }
  }

  useEffect(() => {
    if (user?.email) {
      loadMOMRecords()
    }
  }, [user?.email, statusFilter, approvalStatusFilter, searchTerm, visitId])

  // Handle closing an open point
  const handleCloseOpenPoint = async (momId: string, pointIndex: number) => {
    try {
      await convexAPI.updateMOMOpenPointStatus(momId, pointIndex, 'Closed')
      await loadMOMRecords() // Refresh the data
    } catch (error) {
      console.error('Failed to close open point:', error)
      alert('Failed to close open point. Please try again.')
    }
  }

  // Handle reopening an open point
  const handleReopenOpenPoint = async (momId: string, pointIndex: number) => {
    try {
      await convexAPI.updateMOMOpenPointStatus(momId, pointIndex, 'Open')
      await loadMOMRecords() // Refresh the data
    } catch (error) {
      console.error('Failed to reopen open point:', error)
      alert('Failed to reopen open point. Please try again.')
    }
  }

  // CSV Download functionality
  const downloadMOMAsCSV = (mom: MOMRecord) => {
    if (!mom.open_points || mom.open_points.length === 0) {
      alert('No open points available to download for this MOM.')
      return
    }

    // Create CSV content with the specified format: Brand Name:Sr. No || Topic || Description || Status || To be responded by || Next Steps
    const brandName = mom.brand_name || 'Unknown Brand'
    const csvHeader = `${brandName}:Sr. No,Topic,Description,Status,To be responded by,Next Steps\n`
    
    const csvRows = mom.open_points.map((point, index) => {
      // Escape CSV values by wrapping in quotes and escaping internal quotes
      const escapeCSV = (value: string) => {
        if (!value) return '""'
        const escaped = value.replace(/"/g, '""')
        return `"${escaped}"`
      }

      const srNo = (index + 1).toString()
      const topic = escapeCSV(point.topic)
      const description = escapeCSV(point.description)
      const status = escapeCSV(point.status)
      const toBeRespondedBy = escapeCSV(point.owner_name)
      const nextSteps = escapeCSV(point.next_steps || 'To be determined')

      return `${srNo},${topic},${description},${status},${toBeRespondedBy},${nextSteps}`
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `MOM_${brandName.replace(/[^a-zA-Z0-9]/g, '_')}_${mom.ticket_id}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  // Download all MOMs as CSV
  const downloadAllMOMsAsCSV = () => {
    if (momRecords.length === 0) {
      alert('No MOM records available to download.')
      return
    }

    // Create CSV content for all MOMs
    let csvContent = 'Brand Name,Sr. No,Topic,Description,Status,To be responded by,Next Steps,MOM Ticket ID,Created Date\n'
    
    momRecords.forEach(mom => {
      const brandName = mom.brand_name || 'Unknown Brand'
      
      if (mom.open_points && mom.open_points.length > 0) {
        mom.open_points.forEach((point, index) => {
          // Escape CSV values
          const escapeCSV = (value: string) => {
            if (!value) return '""'
            const escaped = value.replace(/"/g, '""')
            return `"${escaped}"`
          }

          const srNo = (index + 1).toString()
          const topic = escapeCSV(point.topic)
          const description = escapeCSV(point.description)
          const status = escapeCSV(point.status)
          const toBeRespondedBy = escapeCSV(point.owner_name)
          const nextSteps = escapeCSV(point.next_steps || 'To be determined')
          const ticketId = escapeCSV(mom.ticket_id)
          const createdDate = escapeCSV(new Date(mom.created_at).toLocaleDateString())

          csvContent += `${escapeCSV(brandName)},${srNo},${topic},${description},${status},${toBeRespondedBy},${nextSteps},${ticketId},${createdDate}\n`
        })
      } else {
        // Add a row even if no open points
        const escapeCSV = (value: string) => {
          if (!value) return '""'
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        }
        
        csvContent += `${escapeCSV(brandName)},1,"No open points","No open points recorded for this MOM","N/A","N/A","N/A",${escapeCSV(mom.ticket_id)},${escapeCSV(new Date(mom.created_at).toLocaleDateString())}\n`
      }
    })

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `All_MOMs_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // Will redirect to login
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'Open': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800',
    }
    return priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
  }

  const getApprovalStatusBadge = (approvalStatus?: string | null) => {
    if (!approvalStatus) return null;
    
    const approvalColors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Approved': 'bg-green-100 text-green-800 border-green-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
    }
    
    const colorClass = approvalColors[approvalStatus as keyof typeof approvalColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
        {approvalStatus === 'Pending' ? 'Approval Pending' : approvalStatus}
      </span>
    );
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {visitId && (
              <button
                onClick={() => router.push('/dashboard/approvals')}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                title="Back to Approvals"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {visitId ? 'MOM Details' : 'MOM Tracker'}
              </h1>
              <p className="text-white/70">
                {visitId 
                  ? `Viewing MOM for Visit ${visitId}${visitDetails ? ` - ${visitDetails.brand_name}` : ''}`
                  : 'Manage meeting minutes and action items'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Download All MOMs Button - Only show when not viewing specific visit */}
            {!visitId && momRecords.length > 0 && (
              <button
                onClick={downloadAllMOMsAsCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-sm"
                title="Download all MOMs as CSV"
              >
                <Download className="w-4 h-4" />
                Download All CSV
              </button>
            )}
            
            {visitId && visitDetails && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
                <div className="text-right">
                  <div className="text-white font-semibold">{visitDetails.brand_name}</div>
                  <div className="text-white/70 text-sm">Agent: {visitDetails.agent_name}</div>
                  <div className="text-white/60 text-xs">
                    Visit: {new Date(visitDetails.scheduled_date).toLocaleDateString()}
                  </div>
                  {visitDetails.approval_status && (
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      visitDetails.approval_status === 'Approved' 
                        ? 'bg-green-100 text-green-800'
                        : visitDetails.approval_status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {visitDetails.approval_status}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters - Hide when viewing specific visit */}
        {!visitId && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search MOM records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" className="bg-white text-gray-800">All Status</option>
                  <option value="Open" className="bg-white text-gray-800">Open</option>
                  <option value="In Progress" className="bg-white text-gray-800">In Progress</option>
                  <option value="Resolved" className="bg-white text-gray-800">Resolved</option>
                  <option value="Closed" className="bg-white text-gray-800">Closed</option>
                </select>
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" className="bg-white text-gray-800">All Approvals</option>
                  <option value="Pending" className="bg-white text-gray-800">Pending</option>
                  <option value="Approved" className="bg-white text-gray-800">Approved</option>
                  <option value="Rejected" className="bg-white text-gray-800">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* MOM Records */}
        {loading ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
            <div className="text-white">Loading MOM records...</div>
          </div>
        ) : momRecords.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
            <MessageSquare className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No MOM Records Found</h3>
            <p className="text-white/70">
              {visitId 
                ? `No MOM record found for visit ${visitId}. The MOM may not have been submitted yet.`
                : searchTerm || statusFilter 
                ? 'No MOM records match your current filters.' 
                : 'No MOM records have been created yet. Submit a visit MOM to get started.'}
            </p>
            {visitId && (
              <button
                onClick={() => router.push('/dashboard/approvals')}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Back to Approvals
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {momRecords.map((mom) => {
              const isSelectedMOM = visitId && mom.visit_id === visitId
              return (
                <div 
                  key={mom._id} 
                  className={`backdrop-blur-md rounded-xl border p-6 ${
                    isSelectedMOM 
                      ? 'bg-blue-500/20 border-blue-400/50 ring-2 ring-blue-400/30' 
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  {/* MOM Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isSelectedMOM && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/30 border border-blue-400/50 rounded-full">
                            <Eye className="w-4 h-4 text-blue-200" />
                            <span className="text-blue-200 text-sm font-medium">Selected MOM</span>
                          </div>
                        )}
                        <h3 className="text-lg font-semibold text-white">{mom.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(mom.status)}`}>
                          {mom.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(mom.priority)}`}>
                          {mom.priority}
                        </span>
                        {/* Approval Status Badge */}
                        {mom.visit_id && getApprovalStatusBadge(mom.visit_approval_status)}
                      </div>
                      <p className="text-white/70 text-sm mb-2">{mom.description}</p>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(mom.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {mom.created_by}
                        </div>
                        {mom.brand_name && (
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {mom.brand_name}
                          </div>
                        )}
                        {mom.visit_id && (
                          <div className="flex items-center gap-1">
                            <Ticket className="w-4 h-4" />
                            Visit: {mom.visit_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Download CSV Button for individual MOM */}
                      {mom.open_points && mom.open_points.length > 0 && (
                        <button
                          onClick={() => downloadMOMAsCSV(mom)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors font-medium shadow-sm"
                          title="Download this MOM as CSV"
                        >
                          <Download className="w-3 h-3" />
                          CSV
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-xs text-white/60">Ticket ID</div>
                        <div className="text-sm font-mono text-white">{mom.ticket_id}</div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Details - Show when MOM is rejected */}
                  {mom.visit_approval_status === 'Rejected' && mom.visit_rejection_remarks && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-200 mb-1">MOM Rejected</h4>
                          <p className="text-red-100 text-sm mb-2">{mom.visit_rejection_remarks}</p>
                          <div className="flex items-center gap-4 text-xs text-red-300">
                            {mom.visit_rejected_by && (
                              <span>Rejected by: {mom.visit_rejected_by}</span>
                            )}
                            {mom.visit_rejected_at && (
                              <span>Date: {new Date(mom.visit_rejected_at).toLocaleDateString()}</span>
                            )}
                            {mom.visit_resubmission_count !== undefined && mom.visit_resubmission_count !== null && mom.visit_resubmission_count > 0 && (
                              <span>Resubmissions: {mom.visit_resubmission_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Open Points */}
                  {mom.open_points && mom.open_points.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                        Open Points 
                        <span className="text-sm font-normal text-white/70">
                          ({mom.open_points.filter(p => p.status === 'Open').length} open, {mom.open_points.filter(p => p.status === 'Closed').length} closed)
                        </span>
                      </h4>
                      <div className="space-y-3">
                        {mom.open_points.map((point, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-medium text-white">{point.topic}</h5>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    point.status === 'Closed' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {point.status}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    point.ownership === 'Brand' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {point.ownership}
                                  </span>
                                </div>
                                <p className="text-white/70 text-sm mb-2">{point.description}</p>
                                <div className="flex items-center gap-4 text-xs text-white/60">
                                  <span>Owner: {point.owner_name}</span>
                                  <span>Timeline: {point.timeline ? new Date(point.timeline).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                {point.status === 'Open' ? (
                                  <button
                                    onClick={() => handleCloseOpenPoint(mom._id, index)}
                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors font-medium shadow-sm"
                                  >
                                    Mark Closed
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReopenOpenPoint(mom._id, index)}
                                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md transition-colors font-medium shadow-sm"
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional context for visit-specific MOMs */}
                  {isSelectedMOM && visitDetails && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <h4 className="text-md font-semibold text-white mb-3">Visit Context</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-white/60 text-xs">Visit Status</div>
                          <div className="text-white font-medium">{visitDetails.visit_status}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-white/60 text-xs">Approval Status</div>
                          <div className={`font-medium ${
                            visitDetails.approval_status === 'Approved' ? 'text-green-400' :
                            visitDetails.approval_status === 'Rejected' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {visitDetails.approval_status || 'Pending'}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-white/60 text-xs">MOM Shared Date</div>
                          <div className="text-white font-medium">
                            {visitDetails.mom_shared_date ? new Date(visitDetails.mom_shared_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}