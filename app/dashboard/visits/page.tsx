'use client'
import VisitStatistics from '@/components/VisitStatistics';
import TeamVisitStatistics from '@/components/TeamVisitStatistics';
import TeamLeadAgentStatsModal from '@/components/TeamLeadAgentStatsModal';
import TeamLeadAgentStatistics from '@/components/TeamLeadAgentStatistics';
import AllVisitStats from '@/components/AllVisitStats';
import Pagination from '@/components/Pagination';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import ScheduleVisitModal from '@/components/modals/ScheduleVisitModal'
import RescheduleVisitModal from '@/components/modals/RescheduleVisitModal'
import BackdatedVisitModal from '@/components/modals/BackdatedVisitModal'
import EnhancedSubmitMomModal from '@/components/modals/EnhancedSubmitMomModal' // Enhanced MOM modal with CSV support
import ResubmitMomModal from '@/components/modals/ResubmitMomModal' // Resubmission modal
import { PlusCircle, Calendar, CheckCircle, XCircle, Clock, ThumbsUp, RotateCcw, CalendarPlus } from 'lucide-react'

// Define Id type locally to avoid import issues
type Id<T> = string

import { v4 as uuidv4 } from 'uuid';



// Interfaces based on Convex schema
export interface Brand {
  _id: Id<"Master_Data">;
  brandName: string;
  kamEmailId: string;
  zone?: string;
}

export interface Visit {
  _id: Id<"visits">;
  visit_id: string; // The string ID used in mutations
  brand_name: string;
  agent_id?: string; // Agent ID (email)
  agent_name?: string; // Agent name for MOM submission
  scheduled_date: string;
  visit_date?: string; // When the visit was actually completed
  visit_status: string;
  approval_status?: string;
  visit_year: string;
  // Fields for MOM submission (optional, as they are updated later)
  outcome?: string;
  next_steps?: string;
  notes?: string;
  mom_shared?: string; // 'Yes', 'No', 'Pending'
  mom_shared_date?: string;
  // Rejection fields
  rejection_remarks?: string;
  rejected_by?: string;
  rejected_at?: string;
  resubmission_count?: number;
}

export default function VisitManagementPage() {
  const { userProfile, session } = useAuth() // Updated destructuring
  const [loading, setLoading] = useState(true);
  const [allBrands, setAllBrands] = useState<Brand[]>([]); // Store all brands
  const [displayedBrands, setDisplayedBrands] = useState<Brand[]>([]); // Brands currently displayed
  const [visibleBrandsCount, setVisibleBrandsCount] = useState(10); // Number of brands to show
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitStats, setVisitStats] = useState<any>(null);
  const [visitStatsLoading, setVisitStatsLoading] = useState(true);
  const [showAdminStatsModal, setShowAdminStatsModal] = useState(false);
  const [showTeamLeadStatsModal, setShowTeamLeadStatsModal] = useState(false);
  const [showAgentWiseStatsModal, setShowAgentWiseStatsModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  
  // Use ref to prevent concurrent loads
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)

  // Search state
  const [totalBrands, setTotalBrands] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Visits search state
  const [visitsSearchTerm, setVisitsSearchTerm] = useState('');
  const [isVisitsSearching, setIsVisitsSearching] = useState(false);
  const [visitsSearchTimeout, setVisitsSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const brandsPerChunk = 10; // Load 10 brands at a time

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedBrandForSchedule, setSelectedBrandForSchedule] = useState<Brand | null>(null);

  // MOM Modal State
  const [isMomModalOpen, setIsMomModalOpen] = useState(false);
  const [selectedVisitForMom, setSelectedVisitForMom] = useState<Visit | null>(null);

  // Resubmit MOM Modal State
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [selectedVisitForResubmit, setSelectedVisitForResubmit] = useState<Visit | null>(null);
  const [previousMomData, setPreviousMomData] = useState<{
    open_points: any[];
    meeting_notes?: string;
  } | null>(null);

  // Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedVisitForReschedule, setSelectedVisitForReschedule] = useState<Visit | null>(null);

  // Backdated Visit Modal State
  const [isBackdatedModalOpen, setIsBackdatedModalOpen] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Array<{
    email: string;
    full_name: string;
    team_name: string;
  }>>([]);

  const currentYear = new Date().getFullYear().toString();

  const loadData = useCallback(async (search = '', visitsSearch = '', shouldRefreshStats = false) => {
    if (!userProfile) { // Simplified check
      console.log('❌ [Visits] No userProfile, cannot load data');
      return;
    }
    
    // Prevent concurrent loads
    if (loadingRef.current) {
      console.log('⏳ [Visits] Load already in progress, skipping...')
      return
    }

    loadingRef.current = true

    try {
      setLoading(true);
      setVisitStatsLoading(shouldRefreshStats); // Only show stats loading if we're refreshing stats
      setIsSearching(!!search);
      setIsVisitsSearching(!!visitsSearch);

      console.log('🔄 [Visits] Loading data for user:', userProfile.email, 'search:', search, 'visitsSearch:', visitsSearch, 'shouldRefreshStats:', shouldRefreshStats);

      const visitsParams: { search: string; email?: string; teamName?: string } = {
        search: visitsSearch,
      };

      // Add email and teamName to visitsParams if the user is a Team Lead
      const isTeamLead = userProfile?.role?.toLowerCase().includes('team') || userProfile?.role?.toLowerCase().includes('lead');
      if (isTeamLead && userProfile?.teamName) {
        visitsParams.email = userProfile.email; // Pass current user's email
        visitsParams.teamName = userProfile.teamName; // Pass team name
      } else if (userProfile?.role?.toLowerCase() === 'agent') {
        visitsParams.email = userProfile.email; // Agents only see their own visits
      }
      // Admins should see all visits, so no email/teamName filter needed for them


      const [brandsResponse, visitsResponse] = await Promise.all([
        api.getMasterData(1, 999999, search), // Fetch all brands
        api.getVisits(visitsParams)
      ]);
      
      console.log('✅ [Visits] Data loaded successfully');
      
      // Handle all brands response
      if (brandsResponse.data && brandsResponse.data.data) {
        const fetchedBrands = brandsResponse.data.data || [];
        
        // Map the snake_case API response to camelCase Brand interface
        const mappedBrands: Brand[] = fetchedBrands.map((brand: any) => ({
          _id: brand.id || brand._id,
          brandName: brand.brand_name || brand.brandName,
          kamEmailId: brand.kam_email_id || brand.kamEmailId,
          zone: brand.zone
        }));
        
        // Store all brands
        setAllBrands(mappedBrands);
        setTotalBrands(mappedBrands.length);
        
        // Display first chunk
        setVisibleBrandsCount(brandsPerChunk);
        setDisplayedBrands(mappedBrands.slice(0, brandsPerChunk));
      } else {
        // Fallback for old API response format
        const brandsData = Array.isArray(brandsResponse.data) ? brandsResponse.data as any[] : [];
        
        // Map the snake_case API response to camelCase Brand interface
        const mappedBrands: Brand[] = brandsData.map((brand: any) => ({
          _id: brand.id || brand._id,
          brandName: brand.brand_name || brand.brandName,
          kamEmailId: brand.kam_email_id || brand.kamEmailId,
          zone: brand.zone
        }));
        
        // Store all brands
        setAllBrands(mappedBrands);
        setTotalBrands(mappedBrands.length);
        
        // Display first chunk
        setVisibleBrandsCount(brandsPerChunk);
        setDisplayedBrands(mappedBrands.slice(0, brandsPerChunk));
      }
      
      console.log('🔍 [Visits] Raw visits response from API:', visitsResponse); // ADDED LOG
      
      // Handle visits response - check multiple possible response structures
      let visitsData = [];
      if (visitsResponse.page) {
        // Paginated format: { success: true, page: [...], isDone, continueCursor, total }
        visitsData = visitsResponse.page;
      } else if (visitsResponse.success && visitsResponse.data) {
        // New API format: { success: true, data: [...] }
        visitsData = Array.isArray(visitsResponse.data) ? visitsResponse.data : [];
      } else if (visitsResponse.data?.page) {
        // Nested paginated format: { data: { page: [...], isDone, continueCursor } }
        visitsData = visitsResponse.data.page;
      } else if (Array.isArray(visitsResponse.data)) {
        // Direct array format
        visitsData = visitsResponse.data;
      }
      
      setVisits(visitsData);
      
      // Note: VisitStatistics component will load its own data via API
      setVisitStats({}); // Set empty object to indicate data loading is complete
      
      // Only refresh statistics if explicitly requested (e.g., after creating/updating visits)
      if (shouldRefreshStats) {
        setRefreshKey(prev => prev + 1); // Trigger statistics refresh
        console.log('📊 [Visits] Refreshing visit statistics');
      }
    } catch (error) {
      console.error("❌ [Visits] Failed to load data:", error);
      setVisitStats(null); // Explicitly set to null on error
      
      // Only refresh statistics if explicitly requested
      if (shouldRefreshStats) {
        setRefreshKey(prev => prev + 1); // Trigger statistics refresh even on error
      }
    } finally {
      setLoading(false);
      setVisitStatsLoading(false);
      setIsSearching(false);
      setIsVisitsSearching(false);
      loadingRef.current = false
    }
  }, [userProfile?.id, brandsPerChunk]); // Updated dependency array

  // Load more brands when scrolling
  const loadMoreBrands = useCallback(() => {
    const nextCount = visibleBrandsCount + brandsPerChunk;
    setVisibleBrandsCount(nextCount);
    setDisplayedBrands(allBrands.slice(0, nextCount));
    console.log(`📊 Loading more brands: showing ${Math.min(nextCount, allBrands.length)} of ${allBrands.length}`);
  }, [allBrands, visibleBrandsCount, brandsPerChunk]);

  // Infinite scroll effect - horizontal scrolling
  useEffect(() => {
    const brandsContainer = document.getElementById('brands-scroll-container');
    if (!brandsContainer) return;

    const handleScroll = () => {
      const scrollPosition = brandsContainer.scrollLeft + brandsContainer.clientWidth;
      const scrollWidth = brandsContainer.scrollWidth;
      
      // Load more when within 200px of right edge and there are more brands to load
      if (scrollPosition >= scrollWidth - 200 && visibleBrandsCount < allBrands.length && !loading) {
        loadMoreBrands();
      }
    };

    brandsContainer.addEventListener('scroll', handleScroll);
    return () => brandsContainer.removeEventListener('scroll', handleScroll);
  }, [visibleBrandsCount, allBrands.length, loading, loadMoreBrands]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Only auto-search if term is empty (to clear search results)
    if (term === '') {
      loadData(term, visitsSearchTerm, false); // Don't refresh stats for brand search
    }
    // For non-empty terms, only update the input value - don't search automatically
  }, [loadData, searchTimeout, visitsSearchTerm]);

  // Handle search button click or Enter key
  const handleSearchClick = useCallback(() => {
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Trigger immediate search - don't refresh stats for brand search
    loadData(searchTerm, visitsSearchTerm, false);
  }, [loadData, searchTerm, visitsSearchTerm, searchTimeout]);

  // Visits search handlers
  const handleVisitsSearch = useCallback((term: string) => {
    setVisitsSearchTerm(term);
    
    // Clear existing timeout
    if (visitsSearchTimeout) {
      clearTimeout(visitsSearchTimeout);
    }
    
    // Only auto-search if term is empty (to clear search results)
    if (term === '') {
      loadData(searchTerm, term, false); // Don't refresh stats for visit search
    }
    // For non-empty terms, only update the input value - don't search automatically
  }, [loadData, searchTerm, visitsSearchTimeout]);

  // Handle visits search button click or Enter key
  const handleVisitsSearchClick = useCallback(() => {
    // Clear any existing timeout
    if (visitsSearchTimeout) {
      clearTimeout(visitsSearchTimeout);
    }
    
    // Trigger immediate search - don't refresh stats for visit search
    loadData(searchTerm, visitsSearchTerm, false);
  }, [loadData, searchTerm, visitsSearchTerm, visitsSearchTimeout]);

  useEffect(() => {
    if (userProfile) { // Check for userProfile presence
      loadData('', '', true); // Initial load should refresh stats
    } else { // No user profile, redirect to login
      console.log('❌ No userProfile, redirecting to login');
      router.push('/login');
    }
    
    // Cleanup search timeouts on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (visitsSearchTimeout) {
        clearTimeout(visitsSearchTimeout);
      }
    };
  }, [loadData, userProfile, router, searchTimeout, visitsSearchTimeout]); // Updated dependencies

  const visitsByBrand = useMemo(() => {
    const counts: Record<string, { scheduled: number; done: number; total: number }> = {};
    
    for (const brand of displayedBrands) {
      const brandVisits = visits.filter(
        (visit) => visit.brand_name === brand.brandName && visit.visit_year === currentYear && visit.visit_status !== 'Cancelled'
      );
      counts[brand.brandName] = {
        scheduled: brandVisits.length,
        done: brandVisits.filter(v => v.visit_status === 'Visit Done').length,
        total: 2,
      };
    }
    return counts;
  }, [displayedBrands, visits, currentYear]);

  // Schedule Visit Modal Handlers
  const handleOpenScheduleModal = (brand: Brand) => {
    setSelectedBrandForSchedule(brand);
    setIsScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setIsScheduleModalOpen(false);
    setSelectedBrandForSchedule(null);
  };

  const handleScheduleSubmit = async (visitDate: string) => {
    if (!selectedBrandForSchedule || !userProfile) {
      alert("Error: No brand or user selected.");
      return;
    }

    try {
      await api.createVisit({
        visit_id: uuidv4(),
        brand_id: selectedBrandForSchedule._id.toString(),
        brand_name: selectedBrandForSchedule.brandName,
        agent_id: userProfile.email,
        agent_name: userProfile.fullName || 'Unknown Agent',
        team_name: userProfile.teamName,
        scheduled_date: visitDate,
        visit_status: 'Scheduled',
        visit_year: currentYear,
        zone: selectedBrandForSchedule.zone,
      });
      
      handleCloseScheduleModal();
      await loadData('', '', true); // Refresh stats after creating visit
    } catch (error: any) {
      console.error("Failed to schedule visit:", error);
      alert(`Error: ${error.message || error}`);
    }
  };

  // Update Visit Status Handler (Complete/Cancel)
  const handleUpdateVisitStatus = async (visitId: string, status: 'Completed' | 'Cancelled') => {
    try {
      await api.updateVisitStatus(visitId, status);
      await loadData('', '', true); // Refresh stats after updating visit status
    } catch (error: any) {
      console.error(`Failed to update visit status to ${status}:`, error);
      alert(`Error updating visit status: ${error.message || error}`);
    }
  };

  // MOM Modal Handlers
  const handleOpenMomModal = (visit: Visit) => {
    setSelectedVisitForMom(visit);
    setIsMomModalOpen(true);
  };

  const handleCloseMomModal = () => {
    setIsMomModalOpen(false);
    setSelectedVisitForMom(null);
  };

  const handleSubmitMom = async (formData: { 
    open_points: Array<{
      topic: string;
      description: string;
      ownership: string;
      owner_name: string;
      status: string;
      timeline: string;
    }>;
    csv_topics?: Array<{
      sno: string;
      topic: string;
      description: string;
      status: string;
      assignedTo: string;
      nextSteps: string;
    }>;
    meeting_summary?: string;
  }) => {
    if (!selectedVisitForMom) {
      alert("Error: No visit selected for MOM submission.");
      return;
    }

    try {
      console.log('📝 Submitting MOM for visit:', selectedVisitForMom.visit_id);
      
      // Submit the enhanced MOM with open points
      const result = await api.submitVisitMOM({
        visit_id: selectedVisitForMom.visit_id,
        created_by: userProfile?.email || '',
        brand_name: selectedVisitForMom.brand_name,
        agent_name: selectedVisitForMom.agent_name || userProfile?.fullName || 'Unknown Agent',
        open_points: formData.open_points,
        mom_shared: "Yes", // ✅ FIX: Add mom_shared to trigger approval workflow
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit MOM');
      }

      console.log('✅ MOM submitted successfully with approval workflow triggered');
      
      handleCloseMomModal();
      await loadData('', '', true); // Refresh stats after submitting MOM
      
      alert('MOM submitted successfully! Waiting for Team Lead approval.');
    } catch (error: any) {
      console.error("Failed to submit MOM:", error);
      alert(`Error submitting MOM: ${error.message || error}`);
    }
  };

  const handleResubmitMom = async (visitId: string) => {
    if (!userProfile?.email) { // Updated check
      alert("Error: User not authenticated.");
      return;
    }

    // Find the visit and fetch previous MOM data
    const visit = visits.find(v => v.visit_id === visitId);
    if (visit) {
      try {
        // Fetch previous MOM data for this visit
        console.log('🔍 Fetching previous MOM data for visit:', visitId);
        
        // Get all MOM records for the user (without search filter first)
        const momResponse = await api.getMOM({
          limit: 1000 // Get more records to ensure we find the visit MOM
        });
        
        console.log('📋 All MOM Response:', momResponse);
        
        // Find the MOM record for this specific visit
        const visitMOM = momResponse.data.data.find((mom: any) => {
          console.log('🔍 Checking MOM:', { mom_visit_id: mom.visit_id, target_visit_id: visitId });
          return mom.visit_id === visitId;
        });
        
        console.log('🎯 Found visitMOM:', visitMOM);
        
        if (visitMOM && visitMOM.open_points && visitMOM.open_points.length > 0) {
          console.log('✅ Found previous MOM with open points:', visitMOM.open_points);
          setPreviousMomData({
            open_points: visitMOM.open_points,
            meeting_notes: visitMOM.notes
          });
        } else {
          console.log('⚠️ No previous MOM data found for visit:', visitId);
          console.log('   - visitMOM exists:', !!visitMOM);
          console.log('   - has open_points:', !!visitMOM?.open_points);
          console.log('   - open_points length:', visitMOM?.open_points?.length);
          setPreviousMomData(null);
        }
      } catch (error) {
        console.error('❌ Error fetching previous MOM data:', error);
        setPreviousMomData(null);
      }
      
      setSelectedVisitForResubmit(visit);
      setIsResubmitModalOpen(true);
    }
  };

  const handleResubmitMomSubmit = async (formData: { 
    open_points: any[];
    resubmission_notes?: string;
  }) => {
    if (!userProfile?.email || !selectedVisitForResubmit) { // Updated check
      alert("Error: User not authenticated or no visit selected.");
      return;
    }

    try {
      // First resubmit the MOM to reset its status
      await api.resubmitMoM(selectedVisitForResubmit.visit_id); // Updated
      
      // Sanitize open_points: Remove created_at and updated_at fields that Convex doesn't expect
      const sanitizedOpenPoints = formData.open_points.map(point => {
        const { created_at, updated_at, ...sanitizedPoint } = point;
        return {
          topic: sanitizedPoint.topic,
          description: sanitizedPoint.description,
          next_steps: sanitizedPoint.next_steps || 'To be determined',
          ownership: sanitizedPoint.ownership,
          owner_name: sanitizedPoint.owner_name,
          status: sanitizedPoint.status,
          timeline: sanitizedPoint.timeline
        };
      });
      
      // Then submit the new MOM data with sanitized open points, marking it as a resubmission
      await api.submitVisitMOM({
        visit_id: selectedVisitForResubmit.visit_id,
        created_by: userProfile.email, // Updated
        brand_name: selectedVisitForResubmit.brand_name,
        agent_name: selectedVisitForResubmit.agent_name || userProfile.fullName || 'Unknown Agent',
        open_points: sanitizedOpenPoints,
        is_resubmission: true,
        resubmission_notes: formData.resubmission_notes,
        mom_shared: "Yes", // ✅ FIX: Add mom_shared to trigger approval workflow
      });

      setIsResubmitModalOpen(false);
      setSelectedVisitForResubmit(null);
      await loadData('', '', true); // Refresh stats after resubmitting MOM
      alert("MOM has been resubmitted for review with updated action items.");
    } catch (error: any) {
      console.error("Failed to resubmit MOM:", error);
      alert(`Error resubmitting MOM: ${error.message || error}`);
    }
  };

  // Reschedule Visit Handlers
  const handleOpenRescheduleModal = (visit: Visit) => {
    setSelectedVisitForReschedule(visit);
    setIsRescheduleModalOpen(true);
  };

  const handleCloseRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setSelectedVisitForReschedule(null);
  };

  const handleRescheduleSubmit = async (newDate: string, reason: string) => {
    if (!selectedVisitForReschedule || !userProfile?.email) { // Updated check
      alert("Error: No visit selected or user not authenticated.");
      return;
    }

    try {
      await api.rescheduleVisit(
        selectedVisitForReschedule.visit_id,
        newDate,
        reason
      );
      
      handleCloseRescheduleModal();
      await loadData('', '', true); // Refresh stats after rescheduling
      alert("Visit has been successfully rescheduled.");
    } catch (error: any) {
      console.error("Failed to reschedule visit:", error);
      throw error; // Let the modal handle the error display
    }
  };

  // Backdated Visit Handlers
  const handleOpenBackdatedModal = async () => {
    // Normalize role for comparison
    const normalizedRole = userProfile?.role?.toLowerCase().replace(/[_\s]/g, '');
    
    // Load available agents if user is Team Lead or Admin
    if (normalizedRole === 'teamlead' || normalizedRole === 'admin') {
      try {
        let agents: Array<{
          email: string;
          full_name: string;
          team_name: string;
        }> = [];

        console.log('📋 Loading agents for backdated visit. User role:', userProfile?.role);

        if (normalizedRole === 'teamlead') {
          // Team Leads see all agents in their team
          console.log('👥 Fetching team members for team:', userProfile?.teamName);
          const teamMembers = await api.getTeamMembers(userProfile?.teamName || '');
          
          console.log('📊 Team members response:', teamMembers);
          
          if (teamMembers.success && teamMembers.data) {
            agents = teamMembers.data
              .filter((member: any) => {
                const memberRole = member.role?.toLowerCase().replace(/[_\s]/g, '');
                return memberRole === 'agent';
              })
              .map((member: any) => ({
                email: member.email,
                full_name: member.full_name,
                team_name: member.team_name
              }));
            
            console.log('✅ Filtered agents:', agents);
          }
        } else if (normalizedRole === 'admin') {
          // Admins see all active agents
          console.log('👥 Fetching all active agents');
          const allAgents = await api.getAllActiveAgents();
          
          if (allAgents.success && allAgents.data) {
            agents = allAgents.data.map((agent: any) => ({
              email: agent.email,
              full_name: agent.full_name,
              team_name: agent.team_name || 'Unknown'
            }));
            
            console.log('✅ All agents:', agents);
          }
        }

        setAvailableAgents(agents);
        console.log('✅ Available agents set:', agents.length);
      } catch (error) {
        console.error('❌ Error loading agents:', error);
        setAvailableAgents([]);
      }
    } else {
      console.log('⚠️ User role not authorized for backdated visits:', userProfile?.role);
    }
    
    setIsBackdatedModalOpen(true);
  };

  const handleCloseBackdatedModal = () => {
    setIsBackdatedModalOpen(false);
    setAvailableAgents([]);
  };

  const handleBackdatedVisitSubmit = async (visitData: {
    brand_id: string;
    brand_name: string;
    agent_id: string;
    agent_name: string;
    team_name?: string;
    scheduled_date: string;
    visit_status: string;
    purpose?: string;
    zone?: string;
    backdate_reason: string;
  }) => {
    if (!userProfile?.email) { // Updated check
      alert("Error: User not authenticated.");
      return;
    }

    try {
      const visitYear = new Date(visitData.scheduled_date).getFullYear().toString();
      
      await api.scheduleBackdatedVisit({
        visit_id: uuidv4(),
        brand_id: visitData.brand_id,
        brand_name: visitData.brand_name,
        agent_id: visitData.agent_id,
        agent_name: visitData.agent_name,
        team_name: visitData.team_name,
        scheduled_date: visitData.scheduled_date,
        visit_status: visitData.visit_status,
        purpose: visitData.purpose,
        zone: visitData.zone,
        visit_year: visitYear,
        backdate_reason: visitData.backdate_reason,
        created_by: userProfile.email,
      });
      
      handleCloseBackdatedModal();
      await loadData('', '', true); // Refresh stats after backdated visit
      alert("Backdated visit has been successfully scheduled.");
    } catch (error: any) {
      console.error("Failed to schedule backdated visit:", error);
      throw error; // Let the modal handle the error display
    }
  };

  const getStatusChip = (status: string, approvalStatus?: string) => {
    // Show rejection status if MOM was rejected
    if (approvalStatus === 'Rejected') {
      return <div className="chip bg-red-100 text-red-800 border border-red-300"><XCircle className="w-4 h-4" />MOM Rejected</div>;
    }
    
    // Show approved status if MOM was approved
    if (approvalStatus === 'Approved' && status === 'Completed') {
      return <div className="chip bg-green-100 text-green-800"><ThumbsUp className="w-4 h-4" />Visit Done</div>;
    }
    
    // Show pending approval if completed and waiting for approval
    if (status === 'Completed' && approvalStatus === 'Pending') {
      return <div className="chip bg-orange-100 text-orange-800"><Clock className="w-4 h-4" />Pending Approval</div>;
    }
    
    switch (status) {
      case 'Scheduled':
        return <div className="chip bg-blue-100 text-blue-800"><Calendar className="w-4 h-4" />Scheduled</div>;
      case 'Completed':
        return <div className="chip bg-yellow-100 text-yellow-800"><CheckCircle className="w-4 h-4" />Completed</div>;
      case 'Pending':
        // Legacy status - treat as pending approval
        return <div className="chip bg-orange-100 text-orange-800"><Clock className="w-4 h-4" />Pending Approval</div>;
      case 'Visit Done':
        return <div className="chip bg-green-100 text-green-800"><ThumbsUp className="w-4 h-4" />Visit Done</div>;
      case 'Cancelled':
        return <div className="chip bg-red-100 text-red-800"><XCircle className="w-4 h-4" />Cancelled</div>;
      default:
        return <div className="chip bg-gray-100 text-gray-800">{status}</div>;
    }
  };


  if (!userProfile) { // Updated initial check, removed authLoading
    return null // Will redirect to login
  }

  return (
    <>
    <DashboardLayout userProfile={userProfile}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-secondary-800">Visit Management</h1>
          
          {/* Team Lead and Admin Actions */}
          {((userProfile?.role === 'Team Lead' || userProfile?.role === 'team_lead' || userProfile?.role === 'TEAM_LEAD') || 
            (userProfile?.role === 'Admin' || userProfile?.role === 'admin')) && (
            <div className="flex gap-3">
              <button
                onClick={handleOpenBackdatedModal}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors shadow-sm"
              >
                <CalendarPlus className="w-4 h-4" />
                Schedule Backdated Visit
              </button>
            </div>
          )}
        </div>

        {/* Statistics Section - Role-based Display */}
        {userProfile?.role === 'Admin' || userProfile?.role === 'admin' ? (
          <AllVisitStats 
            userEmail={userProfile?.email || ''} 
            refreshKey={refreshKey}
          />
        ) : (userProfile?.role === 'Team Lead' || userProfile?.role === 'team_lead' || userProfile?.role === 'TEAM_LEAD') ? (
          <TeamVisitStatistics 
            userEmail={userProfile?.email || ''} 
            refreshKey={refreshKey}
            onViewAgentStats={() => setShowAgentWiseStatsModal(true)} // Pass handler to show modal
          />
        ) : (userProfile?.role !== 'Admin' && userProfile?.role !== 'admin') ? (
          <VisitStatistics userEmail={userProfile?.email || ''} refreshKey={refreshKey} />
        ) : null}

        <div className="glass-morphism p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Brands (Visit Quota for {currentYear})
                {totalBrands > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({totalBrands} total brands)
                  </span>
                )}
              </h2>
              
              {/* Enhanced Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <input
                    id="visit-search"
                    name="visit-search"
                    type="text"
                    placeholder={
                      userProfile?.role === 'Admin' 
                        ? "Search by brand, KAM name, KAM email, brand email, team..."
                        : userProfile?.role === 'Team Lead'
                        ? "Search by brand, KAM name, KAM email, team member..."
                        : "Search by brand name..."
                    }
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchClick();
                      }
                    }}
                    className="w-full px-4 py-2 pl-10 pr-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoComplete="off"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    onClick={handleSearchClick}
                    className="absolute right-2 top-1.5 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                    title="Search (or press Enter)"
                  >
                    Go
                  </button>
                </div>
                {isSearching && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                )}
              </div>
              
              {/* Search Help Text */}
              {userProfile?.role === 'Admin' && (
                <div className="text-xs text-gray-400 mt-2 sm:mt-0">
                  <div className="bg-white/5 p-2 rounded text-xs">
                    <strong>Search by:</strong> Brand name, KAM name, KAM email, Brand email, Team name
                  </div>
                </div>
              )}
              {userProfile?.role === 'Team Lead' && (
                <div className="text-xs text-gray-400 mt-2 sm:mt-0">
                  <div className="bg-white/5 p-2 rounded text-xs">
                    <strong>Search by:</strong> Brand name, KAM name, KAM email, Team member name
                  </div>
                </div>
              )}
            </div>

            {displayedBrands.length > 0 ? (
              <>
                {/* Horizontal scrolling container */}
                <div 
                  id="brands-scroll-container"
                  className="overflow-x-auto pb-4"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E0 #F7FAFC'
                  }}
                >
                  <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
                    {(() => {
                      console.log(`🎨 VISITS PAGE RENDER - Rendering ${displayedBrands.length} brands:`, displayedBrands.map(b => b.brandName));
                      return displayedBrands.map(brand => {
                        const brandVisitData = visitsByBrand[brand.brandName] || { scheduled: 0, done: 0, total: 2};
                        const isQuotaMet = brandVisitData.scheduled >= brandVisitData.total;
                        console.log(`🏢 Rendering brand: ${brand.brandName}, visits: ${brandVisitData.scheduled}/${brandVisitData.total}`);
                        return (
                          <div 
                            key={brand._id.toString()} 
                            className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-between shadow-sm flex-shrink-0"
                            style={{ width: '280px', minWidth: '280px' }}
                          >
                            <div>
                              <h3 className="font-bold text-gray-900 truncate" title={brand.brandName}>{brand.brandName}</h3>
                              <p className="text-sm text-gray-600 mt-2">{brandVisitData.done} / {brandVisitData.total} Visits Done</p>
                              <div className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
                                  <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${(brandVisitData.done / brandVisitData.total) * 100}%` }}></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{brandVisitData.scheduled} scheduled, {brandVisitData.total - brandVisitData.scheduled} remaining.</p>
                            </div>
                            <button 
                              className="btn btn-primary btn-sm mt-4 w-full"
                              onClick={() => handleOpenScheduleModal(brand)}
                              disabled={isQuotaMet}
                            >
                              <PlusCircle className="w-4 h-4" />
                              {isQuotaMet ? 'Quota Met' : 'Schedule Visit'}
                            </button>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* Loading indicator at the end */}
                    {visibleBrandsCount < allBrands.length && (
                      <div 
                        className="flex items-center justify-center flex-shrink-0 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                        style={{ width: '280px', minWidth: '280px' }}
                      >
                        <div className="text-center p-4">
                          <p className="text-sm text-gray-600 mb-2">
                            {displayedBrands.length} of {totalBrands}
                          </p>
                          <button
                            onClick={loadMoreBrands}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Load More →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status message below the scroll container */}
                <div className="mt-2 text-center">
                  {visibleBrandsCount >= allBrands.length && allBrands.length > brandsPerChunk ? (
                    <p className="text-sm text-gray-600">
                      All {totalBrands} brands loaded
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Scroll right to see more brands →
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-600 py-8">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span>Searching brands...</span>
                  </div>
                ) : searchTerm ? (
                  <div>
                    <p>No brands found matching "{searchTerm}"</p>
                    <button 
                      onClick={() => handleSearch('')}
                      className="text-blue-600 hover:text-blue-500 mt-2 underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <p>No brands assigned to you.</p>
                )}
              </div>
            )}
        </div>
        
        <div className="glass-morphism p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-gray-900">All Visits</h2>
              
              {/* Visits Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <input
                    id="all-visits-search"
                    name="all-visits-search"
                    type="text"
                    placeholder={
                      userProfile?.role === 'Admin' 
                        ? "Search visits by brand, KAM, email, team..."
                        : userProfile?.role === 'Team Lead'
                        ? "Search visits by brand, KAM, team member..."
                        : "Search visits by brand, status..."
                    }
                    value={visitsSearchTerm}
                    onChange={(e) => handleVisitsSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleVisitsSearchClick();
                      }
                    }}
                    className="w-full px-4 py-2 pl-10 pr-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    onClick={handleVisitsSearchClick}
                    className="absolute right-2 top-1.5 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                    title="Search visits (or press Enter)"
                  >
                    Go
                  </button>
                </div>
                {isVisitsSearching && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="table-header">Brand</th>
                            <th className="table-header">KAM</th>
                            <th className="table-header">Scheduled Date</th>
                            <th className="table-header">Status</th>
                            <th className="table-header">Approval</th>
                            <th className="table-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-900">
                        {visits.length > 0 ? (
                            visits.map(visit => (
                                <tr key={visit.visit_id || visit._id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="table-cell text-gray-900">{visit.brand_name}</td>
                                    <td className="table-cell">
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900">{visit.agent_name}</div>
                                        <div className="text-gray-600 text-xs">{visit.agent_id}</div>
                                      </div>
                                    </td>
                                    <td className="table-cell text-gray-900">{new Date(visit.scheduled_date).toLocaleDateString()}</td>
                                    <td className="table-cell">{getStatusChip(visit.visit_status, visit.approval_status)}</td>
                                    <td className="table-cell text-gray-900">
                                      {visit.approval_status === 'Pending' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          Pending Review
                                        </span>
                                      ) : visit.approval_status === 'Approved' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Approved
                                        </span>
                                      ) : visit.approval_status === 'Rejected' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          Rejected
                                        </span>
                                      ) : (
                                        <span className="text-gray-500">Not Submitted</span>
                                      )}
                                    </td>
                                    <td className="table-cell">
                                        {visit.visit_status === 'Scheduled' && (
                                            <div className="flex gap-2">
                                                <button 
                                                    className="btn btn-sm btn-success flex items-center gap-1 min-w-[90px] justify-center"
                                                    onClick={() => handleUpdateVisitStatus(visit.visit_id, 'Completed')}
                                                    title="Mark visit as completed"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    Complete
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger flex items-center gap-1 min-w-[80px] justify-center"
                                                    onClick={() => handleUpdateVisitStatus(visit.visit_id, 'Cancelled')}
                                                    title="Cancel this visit"
                                                >
                                                    <XCircle className="w-3 h-3" />
                                                    Cancel
                                                </button>
                                                {/* Reschedule button for Team Lead and Admin */}
                                                {((userProfile?.role === 'Team Lead' || userProfile?.role === 'team_lead' || userProfile?.role === 'TEAM_LEAD') || 
                                                  (userProfile?.role === 'Admin' || userProfile?.role === 'admin')) && (
                                                  <button 
                                                      className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 min-w-[90px] justify-center"
                                                      onClick={() => handleOpenRescheduleModal(visit)}
                                                      title="Reschedule this visit"
                                                  >
                                                      <RotateCcw className="w-3 h-3" />
                                                      Reschedule
                                                  </button>
                                                )}
                                            </div>
                                        )}
                                        {visit.visit_status === 'Completed' && 
                                         !visit.mom_shared && 
                                         visit.approval_status !== 'Pending' && 
                                         visit.approval_status !== 'Approved' && (
                                            <button 
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleOpenMomModal(visit)}
                                                title="Submit Minutes of Meeting"
                                            >Submit MOM</button>
                                        )}
                                        {visit.visit_status === 'Completed' && 
                                         visit.approval_status === 'Pending' && (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                                ⏳ MOM Pending Approval
                                            </span>
                                        )}
                                        {visit.approval_status === 'Rejected' && (
                                            <div className="space-y-2">
                                                <button 
                                                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full border-2 border-orange-400 hover:border-orange-300"
                                                    onClick={() => handleResubmitMom(visit.visit_id)}
                                                    title="Resubmit MOM after addressing feedback"
                                                >
                                                    🔄 Resubmit MOM
                                                </button>
                                                {visit.rejection_remarks && (
                                                    <div className="text-xs bg-red-50 border border-red-200 rounded p-2 max-w-xs">
                                                        <div className="font-medium text-red-800 mb-1">Team Lead Feedback:</div>
                                                        <div className="text-red-700">{visit.rejection_remarks}</div>
                                                        {visit.rejected_at && (
                                                            <div className="text-red-600 mt-1">
                                                                Rejected: {new Date(visit.rejected_at).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        {visit.resubmission_count && visit.resubmission_count > 0 && (
                                                            <div className="text-orange-600 mt-1">
                                                                Resubmissions: {visit.resubmission_count}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {visit.visit_status !== 'Scheduled' && 
                                         visit.visit_status !== 'Completed' && 
                                         visit.approval_status !== 'Rejected' && (
                                            <div className="flex gap-2">
                                              <button className="btn btn-sm btn-secondary" disabled>No Actions</button>
                                              {/* Reschedule button for non-completed visits (Team Lead and Admin only) */}
                                              {(userProfile?.role === 'Team Lead' || userProfile?.role === 'Admin') && 
                                               (visit.visit_status === 'Pending') && (
                                                <button 
                                                    className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 min-w-[90px] justify-center"
                                                    onClick={() => handleOpenRescheduleModal(visit)}
                                                    title="Reschedule this visit"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Reschedule
                                                </button>
                                              )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-600">
                                  {isVisitsSearching ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                      <span>Searching visits...</span>
                                    </div>
                                  ) : visitsSearchTerm ? (
                                    <div>
                                      <p>No visits found matching "{visitsSearchTerm}"</p>
                                      <button 
                                        onClick={() => handleVisitsSearch('')}
                                        className="text-blue-600 hover:text-blue-500 mt-2 underline"
                                      >
                                        Clear search
                                      </button>
                                    </div>
                                  ) : (
                                    <p>No visits scheduled yet.</p>
                                  )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {selectedBrandForSchedule && ( // Use selectedBrandForSchedule
        <ScheduleVisitModal
          isOpen={isScheduleModalOpen} // Use isScheduleModalOpen
          onClose={handleCloseScheduleModal}
          onSchedule={handleScheduleSubmit}
          brandName={selectedBrandForSchedule.brandName}
        />
      )}
    </DashboardLayout>

    {/* Render modals outside of DashboardLayout for proper positioning */}
    {selectedVisitForMom && ( // Render MOM modal only when a visit is selected
      <EnhancedSubmitMomModal
        isOpen={isMomModalOpen}
        onClose={handleCloseMomModal}
        onSubmit={handleSubmitMom}
        visitId={selectedVisitForMom._id} // Pass the Convex Id
        brandName={selectedVisitForMom.brand_name}
        agentName={selectedVisitForMom.agent_name || userProfile?.fullName || 'Unknown Agent'}
        visitCompletionDate={selectedVisitForMom.visit_date || selectedVisitForMom.scheduled_date} // Use visit_date if available, fallback to scheduled_date
      />
    )}

    {/* Admin Agent Statistics Modal - Now using TeamLeadAgentStatsModal with isAdmin prop */}
    {(userProfile?.role === 'Admin' || userProfile?.role === 'admin') && (
      <TeamLeadAgentStatsModal
        isOpen={showAdminStatsModal}
        onClose={() => setShowAdminStatsModal(false)}
        userEmail={userProfile?.email || ''}
        isAdmin={true}
      />
    )}

    {/* Team Lead Agent Statistics Modal (when opened from TeamVisitStatistics) */}
    {(userProfile?.role?.toLowerCase().includes('team') || userProfile?.role?.toLowerCase().includes('lead')) && (
      <TeamLeadAgentStatsModal
        isOpen={showAgentWiseStatsModal}
        onClose={() => setShowAgentWiseStatsModal(false)}
        userEmail={userProfile?.email || ''}
      />
    )}



    {/* Resubmit MOM Modal */}
    {selectedVisitForResubmit && (
      <ResubmitMomModal
        isOpen={isResubmitModalOpen}
        onClose={() => {
          setIsResubmitModalOpen(false);
          setSelectedVisitForResubmit(null);
          setPreviousMomData(null); // Clear previous MOM data when closing
        }}
        onResubmit={handleResubmitMomSubmit}
        visitDetails={{
          visit_id: selectedVisitForResubmit.visit_id,
          brand_name: selectedVisitForResubmit.brand_name,
          agent_name: selectedVisitForResubmit.agent_name || userProfile?.fullName || 'Unknown Agent',
          rejection_remarks: selectedVisitForResubmit.rejection_remarks,
          rejected_by: selectedVisitForResubmit.rejected_by,
          rejected_at: selectedVisitForResubmit.rejected_at,
          resubmission_count: selectedVisitForResubmit.resubmission_count
        }}
        previousMomData={previousMomData || undefined}
        loading={false}
      />
    )}

    {/* Reschedule Visit Modal */}
    {selectedVisitForReschedule && (
      <RescheduleVisitModal
        isOpen={isRescheduleModalOpen}
        onClose={handleCloseRescheduleModal}
        onReschedule={handleRescheduleSubmit}
        visit={{
          visit_id: selectedVisitForReschedule.visit_id,
          brand_name: selectedVisitForReschedule.brand_name,
          scheduled_date: selectedVisitForReschedule.scheduled_date,
          agent_name: selectedVisitForReschedule.agent_name || 'Unknown Agent'
        }}
        userRole={userProfile?.role || 'Agent'}
      />
    )}

    {/* Backdated Visit Modal */}
    <BackdatedVisitModal
      isOpen={isBackdatedModalOpen}
      onClose={handleCloseBackdatedModal}
      onSchedule={handleBackdatedVisitSubmit}
      userRole={userProfile?.role || 'Agent'}
      userTeam={userProfile?.teamName}
      availableBrands={allBrands.map(brand => ({
        brandId: brand._id.toString(),
        brandName: brand.brandName,
        kamEmailId: brand.kamEmailId,
        zone: brand.zone
      }))}
      availableAgents={availableAgents}
    />
    </>
  );
}
