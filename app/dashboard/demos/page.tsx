"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import DemoStatistics from "@/components/DemoStatistics";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import Pagination from "@/components/Pagination";
import BulkDemoForm from "@/components/BulkDemoForm";
import { useRouter, useSearchParams } from "next/navigation";

// Product constants
const PRODUCTS = [
  "Task",
  "Purchase", 
  "Payroll",
  "TRM",
  "Reputation",
  "Franchise Module",
  "Petpooja Franchise",
  "Marketing Automation"
];

const DEMO_CONDUCTORS = [
  "Agent",
  "RM", 
  "MP Training",
  "Product Team"
];

interface Demo {
  _id: string;
  demo_id: string;
  brand_name: string;
  brand_id: string;
  product_name: string;
  agent_id: string;
  agent_name: string;
  team_name?: string;
  zone?: string;
  
  // Step 1
  is_applicable?: boolean;
  non_applicable_reason?: string;
  step1_completed_at?: string;
  
  // Step 2
  usage_status?: string;
  step2_completed_at?: string;
  
  // Step 3
  demo_scheduled_date?: string;
  demo_scheduled_time?: string;
  demo_rescheduled_count?: number;
  
  // Step 4
  demo_completed?: boolean;
  demo_completed_date?: string;
  demo_conducted_by?: string;
  demo_completion_notes?: string;
  
  // Step 5
  conversion_status?: string;
  non_conversion_reason?: string;
  conversion_decided_at?: string;
  
  current_status: string;
  workflow_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Brand {
  brand_name: string;
  brand_email_id?: string;
  kam_name: string;
  brand_state: string;
  zone: string;
  kam_email_id: string;
  _id: string;
  id?: string;
}

interface BrandWithDemos extends Brand {
  demos: Demo[];
  demoProgress: {
    total: number;
    completed: number;
    converted: number;
  };
}

export default function DemosPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<BrandWithDemos[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<BrandWithDemos[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");
  const [formData, setFormData] = useState<any>({});
  const [showBulkForm, setShowBulkForm] = useState(false);
  
  // Pagination and search states - Initialize from URL params
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || ""); // Separate state for input field
  const [itemsPerPage] = useState(12); // Show 12 brands per page
  const [isSearching, setIsSearching] = useState(false);

  // Agent statistics view states
  const [showAgentStats, setShowAgentStats] = useState(false);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loadingAgentStats, setLoadingAgentStats] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadBrandsAndDemos();
    }
  }, [userProfile]);

  // Filter brands based on search term (only when searchTerm changes via Go button)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBrands(brands);
    } else {
      const filtered = brands.filter(brand =>
        brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.kam_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.brand_state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.zone.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBrands(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [brands, searchTerm]);

  // Handle search button click
  const handleSearch = () => {
    setIsSearching(true);
    setSearchTerm(searchInput);
    updateURL(1, searchInput); // Reset to page 1 and update URL
    setTimeout(() => setIsSearching(false), 300);
  };

  // Handle clear button click
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    updateURL(1, ""); // Reset to page 1 and clear search in URL
  };

  // Update URL with current page and search params
  const updateURL = (page: number, search: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const loadBrandsAndDemos = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL brands in chunks of 1000
      let allBrands: Brand[] = [];
      let page = 1;
      let hasMore = true;
      
      console.log('📊 DEMOS PAGE - Starting to fetch brands for user:', userProfile?.email, 'Role:', userProfile?.role);
      
      while (hasMore) {
        const brandsResponse = await api.getMasterData(page, 1000); // Fetch 1000 per page
        const fetchedBrands = brandsResponse.data?.data || [];
        
        if (fetchedBrands.length > 0) {
          allBrands = [...allBrands, ...fetchedBrands];
          console.log(`📊 DEMOS PAGE - Page ${page}: fetched ${fetchedBrands.length} brands (Total: ${allBrands.length})`);
        }
        
        const totalPages = brandsResponse.data?.total_pages || 1;
        hasMore = page < totalPages;
        page++;
        
        // Safety limit
        if (page > 100) {
          console.warn('⚠️ Reached maximum page limit (100)');
          break;
        }
      }
      
      console.log(`✅ DEMOS PAGE - Finished loading ${allBrands.length} brands`);
      
      // Get demos for the user based on their role
      let demosData: any[] = [];
      try {
        const demosResponse = await api.getDemosForAgent(
          userProfile?.email || ""
        );
        demosData = demosResponse.data || [];
      } catch (demoError) {
        console.warn('Could not load demos:', demoError);
        // Continue without demos - they can be initialized
      }
      
      // Map brands with their demos
      const brandsWithDemos: BrandWithDemos[] = allBrands.map((brand: Brand) => {
        // Find demos for this brand - try both id and _id for compatibility
        const brandDemoGroup = demosData.find((dg: any) => 
          dg.brandId === brand.id || dg.brandId === brand._id
        );
        const brandDemos = brandDemoGroup?.products || [];
        
        // Calculate progress
        const completed = brandDemos.filter((d: Demo) => d.workflow_completed).length;
        const converted = brandDemos.filter((d: Demo) => d.conversion_status === "Converted").length;
        
        const demoProgress = {
          total: PRODUCTS.length,
          completed,
          converted,
        };
        
        return {
          ...brand,
          demos: brandDemos,
          demoProgress,
        };
      });
      
      setBrands(brandsWithDemos);
    } catch (error) {
      console.error("Error loading brands and demos:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeBrandDemos = async (brand: Brand) => {
    try {
      // console.log('🚀 Initializing demos for brand:', brand.brand_name);
      
      // Initialize demos using the brand's Master_Data id (Supabase UUID)
      const brandId = brand.id || brand._id;
      if (!brandId) {
        throw new Error('Brand ID not found');
      }
      await api.initializeBrandDemosFromMasterData(brandId);
      
      // console.log('✅ Demos initialized successfully for:', brand.brand_name);
      alert(`Demos initialized successfully for ${brand.brand_name}! All 8 products are now ready.`);
      
      // Reload the page data
      await loadBrandsAndDemos();
    } catch (error) {
      console.error("Error initializing demos:", error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes("already initialized")) {
        alert("Demos are already initialized for this brand. Refreshing data...");
        await loadBrandsAndDemos();
      } else {
        alert("Error initializing demos: " + errorMessage);
      }
    }
  };

  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrand(expandedBrand === brandId ? null : brandId);
    setSelectedDemo(null);
    setActiveStep("");
    setFormData({});
  };

  const openStepInterface = (demo: Demo, step: string) => {
    setSelectedDemo(demo);
    setActiveStep(step);
    setFormData({});
  };

  const closeStepInterface = () => {
    setSelectedDemo(null);
    setActiveStep("");
    setFormData({});
  };

  const handleStep1 = async (isApplicable: boolean, reason?: string) => {
    if (!selectedDemo) return;
    
    try {
      await api.setProductApplicability(
        selectedDemo.demo_id,
        isApplicable,
        reason
      );
      closeStepInterface();
      loadBrandsAndDemos();
    } catch (error) {
      console.error("Error setting applicability:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleStep2 = async (usageStatus: string) => {
    if (!selectedDemo) return;
    
    try {
      await api.setUsageStatus(selectedDemo.demo_id, usageStatus);
      closeStepInterface();
      loadBrandsAndDemos();
    } catch (error) {
      console.error("Error setting usage status:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleScheduleDemo = async () => {
    if (!selectedDemo || !formData.date || !formData.time) return;
    
    try {
      await api.scheduleDemo(
        selectedDemo.demo_id,
        formData.date,
        formData.time,
        formData.reason
      );
      closeStepInterface();
      loadBrandsAndDemos();
    } catch (error) {
      console.error("Error scheduling demo:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleRescheduleDemo = async (demo: Demo) => {
    if (!userProfile?.email || !userProfile?.role) return;
    
    // Set the selected demo and open reschedule interface
    setSelectedDemo(demo);
    setActiveStep("Reschedule Demo");
    setFormData({
      date: demo.demo_scheduled_date || "",
      time: demo.demo_scheduled_time || "",
      reason: ""
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedDemo || !formData.date || !formData.time || !formData.reason) {
      alert("Please fill in all fields");
      return;
    }
    
    try {
      await api.rescheduleDemo(
        selectedDemo.demo_id,
        formData.date,
        formData.time,
        formData.reason
      );
      closeStepInterface();
      loadBrandsAndDemos();
      alert("Demo rescheduled successfully!");
    } catch (error) {
      console.error("Error rescheduling demo:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleCompleteDemo = async () => {
    if (!selectedDemo || !formData.conductedBy) return;
    
    try {
      await api.completeDemo(
        selectedDemo.demo_id,
        formData.conductedBy,
        formData.notes
      );
      closeStepInterface();
      loadBrandsAndDemos();
    } catch (error) {
      console.error("Error completing demo:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleConversionDecision = async (status: string, reason?: string) => {
    if (!selectedDemo) return;
    
    try {
      await api.setConversionDecision(
        selectedDemo.demo_id,
        status,
        reason
      );
      closeStepInterface();
      loadBrandsAndDemos();
    } catch (error) {
      console.error("Error setting conversion:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Step 1 Pending": "bg-yellow-100 text-yellow-800",
      "Step 2 Pending": "bg-blue-100 text-blue-800",
      "Demo Pending": "bg-orange-100 text-orange-800",
      "Demo Scheduled": "bg-purple-100 text-purple-800",
      "Feedback Awaited": "bg-indigo-100 text-indigo-800",
      "Converted": "bg-green-100 text-green-800",
      "Not Converted": "bg-red-100 text-red-800",
      "Not Applicable": "bg-gray-100 text-gray-800",
      "Already Using": "bg-teal-100 text-teal-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const canTakeAction = (demo: Demo) => {
    const lockedStates = ["Converted", "Not Converted", "Not Applicable", "Already Using"];
    return !lockedStates.includes(demo.current_status);
  };

  const canRescheduleDemo = (demo: Demo) => {
    // Only Team Lead and Admin can reschedule demos
    const userRole = userProfile?.role?.toLowerCase().replace(/\s+/g, '_');
    const canReschedule = userRole === 'team_lead' || userRole === 'admin';
    
    // Demo must have completed Step 1 (applicability decision made)
    const step1Completed = demo.step1_completed_at !== undefined && demo.step1_completed_at !== null;
    
    // Team Lead and Admin can reschedule any demo that has completed Step 1
    // This includes: Not Applicable, Already Using, Demo Pending, Demo Scheduled, 
    // Feedback Awaited, Converted, Not Converted
    // But NOT: Step 1 Pending (applicability not yet decided)
    
    return canReschedule && step1Completed;
  };

  const getNextAction = (demo: Demo) => {
    switch (demo.current_status) {
      case "Step 1 Pending":
        return "Step 1: Set Applicability";
      case "Step 2 Pending":
        return "Step 2: Set Usage Status";
      case "Demo Pending":
        return "Step 3: Schedule Demo";
      case "Demo Scheduled":
        return "Step 4: Complete Demo";
      case "Feedback Awaited":
        return "Step 5: Set Conversion";
      default:
        return null;
    }
  };

  // Pagination calculations
  const totalBrands = filteredBrands.length;
  const totalPages = Math.ceil(totalBrands / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBrands = filteredBrands.slice(startIndex, endIndex);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL(page, searchTerm); // Update URL with new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAgentStatistics = async () => {
    try {
      setLoadingAgentStats(true);
      const response = await api.getAgentDemoStatistics();
      if (response.success) {
        setAgentStats(response.data);
      } else {
        console.error('Failed to load agent statistics:', response.error);
        alert('Failed to load agent statistics: ' + response.error);
      }
    } catch (error) {
      console.error('Error loading agent statistics:', error);
      alert('Error loading agent statistics');
    } finally {
      setLoadingAgentStats(false);
    }
  };

  const toggleAgentStatsView = async () => {
    if (!showAgentStats && !agentStats) {
      await loadAgentStatistics();
    }
    setShowAgentStats(!showAgentStats);
  };

  const canViewAgentStats = () => {
    const userRole = userProfile?.role?.toLowerCase().replace(/\s+/g, '_');
    return userRole === 'team_lead' || userRole === 'admin';
  };

  const canResetDemo = () => {
    const userRole = userProfile?.role?.toLowerCase().replace(/\s+/g, '_');
    return userRole === 'team_lead' || userRole === 'admin';
  };

  const handleResetDemo = async (demo: Demo) => {
    if (!canResetDemo()) {
      alert("Only Team Leads and Admins can reset demos");
      return;
    }

    const reason = prompt("Please provide a reason for resetting this demo:\n\n(This will reset the demo to Step 1 Pending state)");
    if (!reason || !reason.trim()) {
      return;
    }

    if (!confirm(`Are you sure you want to reset ${demo.product_name} for ${demo.brand_name}?\n\nThis will clear all progress and return it to the initial state.`)) {
      return;
    }

    try {
      const response = await api.resetDemo(demo.demo_id, reason);
      if (response.success) {
        console.log('✅ Reset successful:', response.data);
        alert(`Demo has been reset successfully!\n\nReset by: ${response.data.resetBy}\n\nThe page will now refresh to show the updated state.`);
        // Force a hard reload to ensure fresh data
        window.location.reload();
      } else {
        alert("Error resetting demo: " + response.error);
      }
    } catch (error) {
      console.error("Error resetting demo:", error);
      alert("Error resetting demo: " + (error as Error).message);
    }
  };

  const handleBulkComplete = async (demo: Demo) => {
    setSelectedDemo(demo);
    setShowBulkForm(true);
  };

  const handleBulkFormSubmit = async (data: any) => {
    if (!selectedDemo) return;

    try {
      const response = await api.bulkCompleteDemo(selectedDemo.demo_id, data);
      if (response.success) {
        alert(response.data.message);
        setShowBulkForm(false);
        setSelectedDemo(null);
        await loadBrandsAndDemos();
      } else {
        alert("Error: " + response.error);
      }
    } catch (error) {
      console.error("Error bulk completing demo:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleBulkFormCancel = () => {
    setShowBulkForm(false);
    setSelectedDemo(null);
  };

  if (loading) {
    return (
      <DashboardLayout userProfile={userProfile}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userProfile={userProfile}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Demos Management</h1>
          <p className="text-gray-600">Manage product demos for your assigned brands</p>
        </div>

        {/* Demo Statistics */}
        <div className="mb-8">
          <DemoStatistics />
        </div>

        {/* Agent-wise Statistics Toggle (Team Lead & Admin only) */}
        {canViewAgentStats() && (
          <div className="mb-6">
            <button
              onClick={toggleAgentStatsView}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{showAgentStats ? 'Hide' : 'View'} Agent-wise Statistics</span>
            </button>
          </div>
        )}

        {/* Agent Statistics View */}
        {showAgentStats && canViewAgentStats() && (
          <div className="mb-8 bg-white rounded-lg shadow-md border p-6">
            {loadingAgentStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : agentStats ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Agent-wise Demo Statistics</h2>
                  <button
                    onClick={loadAgentStatistics}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {/* Overall Summary */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-4">Overall Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-indigo-600">{agentStats.summary.total_agents}</div>
                      <div className="text-sm text-gray-600">Total Agents</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{agentStats.summary.total_brands}</div>
                      <div className="text-sm text-gray-600">Total Brands</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{agentStats.summary.brands_initiated}</div>
                      <div className="text-sm text-gray-600">Brands Initiated</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-orange-600">{agentStats.summary.brands_not_initiated}</div>
                      <div className="text-sm text-gray-600">Yet to Initiate</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-purple-600">{agentStats.summary.total_demos}</div>
                      <div className="text-sm text-gray-600">Total Demos</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{agentStats.summary.total_converted}</div>
                      <div className="text-sm text-gray-600">Converted</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-red-600">{agentStats.summary.total_not_converted}</div>
                      <div className="text-sm text-gray-600">Not Converted</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-yellow-600">{agentStats.summary.total_pending}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-teal-600">{agentStats.summary.total_workflow_completed}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                  </div>
                </div>

                {/* Agent-wise Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent-wise Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Brands</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Initiated</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Yet to Initiate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Demos</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Not Converted</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {agentStats.agent_statistics.map((agent: any, index: number) => (
                          <React.Fragment key={agent.agent_email}>
                            <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                                <div className="text-xs text-gray-500">{agent.agent_email}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{agent.team_name || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{agent.total_brands}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-green-600 font-medium">{agent.brands_initiated}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-orange-600 font-medium">{agent.brands_not_initiated}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{agent.total_demos}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-green-600 font-medium">{agent.converted}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-red-600 font-medium">{agent.not_converted}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-yellow-600 font-medium">{agent.pending}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => {
                                    const agentRow = document.getElementById(`agent-details-${index}`);
                                    if (agentRow) {
                                      agentRow.classList.toggle('hidden');
                                    }
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                            {/* Details row directly below this agent */}
                            <tr key={`details-${agent.agent_email}`} id={`agent-details-${index}`} className="hidden bg-indigo-50 border-l-4 border-indigo-500">
                              <td colSpan={10} className="px-4 py-4">
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-md font-semibold text-indigo-900">Details for {agent.agent_name}</h4>
                                  <button
                                    onClick={() => {
                                      const agentRow = document.getElementById(`agent-details-${index}`);
                                      if (agentRow) {
                                        agentRow.classList.add('hidden');
                                      }
                                    }}
                                    className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="text-sm font-medium">Close</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Status Breakdown */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Status Breakdown
                                    </h5>
                                    <div className="space-y-2">
                                      {Object.entries(agent.status_breakdown).length > 0 ? (
                                        Object.entries(agent.status_breakdown).map(([status, count]: [string, any]) => (
                                          <div key={status} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-700">{status}</span>
                                            <span className="font-medium text-indigo-600">{count}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">No status data available</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Product Breakdown */}
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                      Product Breakdown
                                    </h5>
                                    <div className="space-y-2">
                                      {Object.entries(agent.product_breakdown).length > 0 ? (
                                        Object.entries(agent.product_breakdown).map(([product, count]: [string, any]) => (
                                          <div key={product} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-700">{product}</span>
                                            <span className="font-medium text-indigo-600">{count}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">No product data available</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No statistics available
              </div>
            )}
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="demo-search"
                    name="demo-search"
                    type="text"
                    placeholder="Search brands, KAM, state, or zone..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Go
                </button>
                {(searchInput || searchTerm) && (
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {currentBrands.length} of {totalBrands} brands
            </div>
          </div>
        </div>

        {totalBrands === 0 ? (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              {searchTerm ? (
                <>
                  <p className="text-gray-500 text-lg mb-4">No brands found matching "{searchTerm}"</p>
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-500 hover:text-blue-700 underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg mb-4">No brands assigned to you</p>
                  <p className="text-sm text-gray-400">Contact your admin to get brands assigned</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {currentBrands.map((brand) => (
                <div key={brand.id || brand._id} className="bg-white rounded-lg shadow-md border">
                  {/* Brand Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{brand.brand_name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div key="kam">KAM: {brand.kam_name}</div>
                          <div key="state">State: {brand.brand_state}</div>
                          <div key="zone">Zone: {brand.zone}</div>
                          <div key="progress">Progress: {brand.demoProgress.completed}/{brand.demoProgress.total}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {brand.demos.length === 0 ? (
                          <button
                            onClick={() => initializeBrandDemos(brand)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Get Started
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleBrandExpansion(brand.id || brand._id)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                          >
                            <span>{expandedBrand === (brand.id || brand._id) ? 'Hide' : 'Show'} Demos</span>
                            <svg 
                              className={`w-4 h-4 transition-transform ${expandedBrand === (brand.id || brand._id) ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {brand.demos.length > 0 && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(brand.demoProgress.completed / brand.demoProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Completed: {brand.demoProgress.completed}</span>
                          <span>Converted: {brand.demoProgress.converted}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Demo Management */}
                  {expandedBrand === (brand.id || brand._id) && brand.demos.length > 0 && (
                    <div className="p-6">
                      {/* 5-Step Workflow Guide */}
                      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-blue-900 mb-3">Demo Workflow Steps</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="text-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">1</div>
                            <h5 className="text-xs font-medium text-blue-900">Applicability</h5>
                            <p className="text-xs text-blue-700">Is product applicable?</p>
                          </div>
                          <div className="text-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">2</div>
                            <h5 className="text-xs font-medium text-blue-900">Usage Status</h5>
                            <p className="text-xs text-blue-700">Already using or demo needed?</p>
                          </div>
                          <div className="text-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">3</div>
                            <h5 className="text-xs font-medium text-blue-900">Schedule</h5>
                            <p className="text-xs text-blue-700">Set date/time for demo</p>
                          </div>
                          <div className="text-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">4</div>
                            <h5 className="text-xs font-medium text-blue-900">Complete</h5>
                            <p className="text-xs text-blue-700">Mark demo as done</p>
                          </div>
                          <div className="text-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">5</div>
                            <h5 className="text-xs font-medium text-blue-900">Decision</h5>
                            <p className="text-xs text-blue-700">Converted or not?</p>
                          </div>
                        </div>
                      </div>

                      {/* Products List */}
                      <div className="space-y-4">
                        {PRODUCTS.map((productName) => {
                          const demo = brand.demos.find(d => d.product_name === productName);
                          
                          return (
                            <div key={productName} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <h4 className="font-medium text-gray-900">{productName}</h4>
                                  {demo && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(demo.current_status)}`}>
                                      {demo.current_status}
                                    </span>
                                  )}
                                  {demo?.workflow_completed && (
                                    <span className="text-xs text-gray-500">🔒 Locked</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {/* Bulk Complete Button - Only for Step 1 Pending */}
                                  {demo && demo.current_status === "Step 1 Pending" && (
                                    <button
                                      onClick={() => handleBulkComplete(demo)}
                                      className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded text-sm hover:from-purple-600 hover:to-indigo-600 transition-colors flex items-center space-x-1"
                                      title="Complete all 5 steps at once"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      <span>Quick Complete</span>
                                    </button>
                                  )}

                                  {/* Regular Step-by-Step Button */}
                                  {demo && canTakeAction(demo) && (
                                    <button
                                      onClick={() => {
                                        const action = getNextAction(demo);
                                        if (action) openStepInterface(demo, action);
                                      }}
                                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                                    >
                                      {getNextAction(demo)}
                                    </button>
                                  )}
                                  
                                  {/* Reschedule Button */}
                                  {demo && canRescheduleDemo(demo) && (
                                    <button
                                      onClick={() => handleRescheduleDemo(demo)}
                                      className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors flex items-center space-x-1"
                                      title="Reschedule Demo (Team Lead/Admin only)"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>Reschedule</span>
                                    </button>
                                  )}

                                  {/* Reset Button - Team Lead and Admin only */}
                                  {demo && canResetDemo() && demo.step1_completed_at && (
                                    <button
                                      onClick={() => handleResetDemo(demo)}
                                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors flex items-center space-x-1"
                                      title="Reset Demo to Initial State (Team Lead/Admin only)"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      <span>Reset</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {demo && (
                                <>
                                  {/* 5-Step Progress Indicator */}
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center space-x-2">
                                        <div className={`flex items-center space-x-1 ${demo.step1_completed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${demo.step1_completed_at ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            1
                                          </div>
                                        </div>
                                        <span className="text-gray-300">→</span>
                                        <div className={`flex items-center space-x-1 ${demo.step2_completed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${demo.step2_completed_at ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            2
                                          </div>
                                        </div>
                                        <span className="text-gray-300">→</span>
                                        <div className={`flex items-center space-x-1 ${demo.demo_scheduled_date ? 'text-green-600' : 'text-gray-400'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${demo.demo_scheduled_date ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            3
                                          </div>
                                        </div>
                                        <span className="text-gray-300">→</span>
                                        <div className={`flex items-center space-x-1 ${demo.demo_completed ? 'text-green-600' : 'text-gray-400'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${demo.demo_completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            4
                                          </div>
                                        </div>
                                        <span className="text-gray-300">→</span>
                                        <div className={`flex items-center space-x-1 ${demo.conversion_status ? 'text-green-600' : 'text-gray-400'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${demo.conversion_status ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            5
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Additional Info */}
                                  {demo.demo_scheduled_date && (
                                    <div className="text-sm text-gray-600 mb-2">
                                      Scheduled: {demo.demo_scheduled_date} at {demo.demo_scheduled_time}
                                      {demo.demo_rescheduled_count && demo.demo_rescheduled_count > 0 && (
                                        <span className="ml-2 text-orange-600">
                                          (Rescheduled {demo.demo_rescheduled_count} times)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {demo.demo_completed && (
                                    <div className="text-sm text-gray-600">
                                      Completed by: {demo.demo_conducted_by} on {demo.demo_completed_date?.split('T')[0]}
                                    </div>
                                  )}

                                  {/* Inline Step Interface */}
                                  {selectedDemo?.demo_id === demo.demo_id && activeStep && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                      <h5 className="font-medium text-gray-900 mb-3">
                                        {activeStep} - {demo.product_name}
                                      </h5>

                                      {activeStep === "Step 1: Set Applicability" && (
                                        <div className="space-y-4">
                                          <p className="text-sm text-gray-600">Is this product applicable for {demo.brand_name}?</p>
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={() => handleStep1(true)}
                                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                            >
                                              ✅ Applicable
                                            </button>
                                            <button
                                              onClick={() => {
                                                const reason = prompt("Please provide reason for non-applicability:");
                                                if (reason) handleStep1(false, reason);
                                              }}
                                              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                              ❌ Not Applicable
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {activeStep === "Step 2: Set Usage Status" && (
                                        <div className="space-y-4">
                                          <p className="text-sm text-gray-600">What is the current usage status?</p>
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={() => handleStep2("Already Using")}
                                              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
                                            >
                                              🟢 Already Using
                                            </button>
                                            <button
                                              onClick={() => handleStep2("Demo Pending")}
                                              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                                            >
                                              🟡 Demo Pending
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {activeStep === "Step 3: Schedule Demo" && (
                                        <div className="space-y-4">
                                          <p className="text-sm text-gray-600 mb-4">Schedule the demo for this product</p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Demo Date</label>
                                              <input
                                                type="date"
                                                value={formData.date || ""}
                                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Demo Time</label>
                                              <input
                                                type="time"
                                                value={formData.time || ""}
                                                onChange={(e) => setFormData({...formData, time: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                            </div>
                                          </div>
                                          {demo.demo_scheduled_date && (
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Reschedule Reason</label>
                                              <input
                                                type="text"
                                                value={formData.reason || ""}
                                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                                placeholder="Why are you rescheduling?"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                            </div>
                                          )}
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={handleScheduleDemo}
                                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                              {demo.demo_scheduled_date ? "Reschedule" : "Schedule"} Demo
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {activeStep === "Step 4: Complete Demo" && (
                                        <div className="space-y-4">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Who conducted the demo?</label>
                                            <select
                                              value={formData.conductedBy || ""}
                                              onChange={(e) => setFormData({...formData, conductedBy: e.target.value})}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="">Select conductor</option>
                                              {DEMO_CONDUCTORS.map(conductor => (
                                                <option key={conductor} value={conductor}>{conductor}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes (Optional)</label>
                                            <textarea
                                              value={formData.notes || ""}
                                              onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                              placeholder="Any notes about the demo..."
                                              rows={3}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                          </div>
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={handleCompleteDemo}
                                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                            >
                                              Mark Demo Complete
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {activeStep === "Step 5: Set Conversion" && (
                                        <div className="space-y-4">
                                          <p className="text-sm text-gray-600">What was the outcome of the demo?</p>
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={() => handleConversionDecision("Converted")}
                                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                            >
                                              ✅ Converted
                                            </button>
                                            <button
                                              onClick={() => {
                                                const reason = prompt("Please provide reason for non-conversion:");
                                                if (reason) handleConversionDecision("Not Converted", reason);
                                              }}
                                              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                              ❌ Not Converted
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {activeStep === "Reschedule Demo" && (
                                        <div className="space-y-4">
                                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                            <h6 className="font-medium text-orange-900 mb-1">
                                              {demo.demo_scheduled_date ? 'Reschedule Demo' : 'Schedule Demo (Admin Override)'}
                                            </h6>
                                            {demo.demo_scheduled_date ? (
                                              <p className="text-sm text-orange-700">
                                                Current Schedule: {demo.demo_scheduled_date} at {demo.demo_scheduled_time}
                                                {demo.demo_rescheduled_count && demo.demo_rescheduled_count > 0 && (
                                                  <span className="ml-2">(Rescheduled {demo.demo_rescheduled_count} times)</span>
                                                )}
                                              </p>
                                            ) : (
                                              <p className="text-sm text-orange-700">
                                                This demo was never scheduled. You are scheduling it for the first time.
                                              </p>
                                            )}
                                            <p className="text-sm text-orange-600 mt-1">
                                              Status: <span className="font-medium">{demo.current_status}</span>
                                              {demo.demo_completed && (
                                                <span className="ml-2">• Completed by {demo.demo_conducted_by}</span>
                                              )}
                                            </p>
                                            
                                            {/* Warning for final states */}
                                            {(demo.current_status === "Not Applicable" || 
                                              demo.current_status === "Already Using" ||
                                              demo.current_status === "Converted" || 
                                              demo.current_status === "Not Converted" ||
                                              demo.current_status === "Feedback Awaited") && (
                                              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                                                <strong>⚠️ Administrative Reschedule:</strong> This demo is in a final state ({demo.current_status}). 
                                                Rescheduling will update the scheduled time for record-keeping purposes but will not change the workflow status or completion state.
                                                {demo.conversion_status && (
                                                  <span className="block mt-1">Conversion decision: <strong>{demo.conversion_status}</strong></span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {demo.demo_scheduled_date ? 'New Demo Date' : 'Demo Date'}
                                              </label>
                                              <input
                                                type="date"
                                                value={formData.date || ""}
                                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                min={new Date().toISOString().split('T')[0]}
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {demo.demo_scheduled_date ? 'New Demo Time' : 'Demo Time'}
                                              </label>
                                              <input
                                                type="time"
                                                value={formData.time || ""}
                                                onChange={(e) => setFormData({...formData, time: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                              />
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              {demo.demo_scheduled_date ? 'Reason for Rescheduling *' : 'Reason for Scheduling *'}
                                            </label>
                                            <textarea
                                              value={formData.reason || ""}
                                              onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                              placeholder={demo.demo_scheduled_date ? 
                                                "Please provide a reason for rescheduling this demo..." :
                                                "Please provide a reason for scheduling this demo (Admin Override)..."
                                              }
                                              rows={3}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                              required
                                            />
                                          </div>
                                          
                                          <div className="flex space-x-3">
                                            <button
                                              onClick={handleRescheduleSubmit}
                                              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center space-x-2"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              <span>{demo.demo_scheduled_date ? 'Reschedule Demo' : 'Schedule Demo'}</span>
                                            </button>
                                            <button
                                              onClick={closeStepInterface}
                                              className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={totalBrands}
                  recordsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  hasNext={hasNext}
                  hasPrev={hasPrev}
                />
              </div>
            )}
          </>
        )}

        {/* Bulk Demo Form Modal */}
        {showBulkForm && selectedDemo && (
          <BulkDemoForm
            demo={selectedDemo}
            onSubmit={handleBulkFormSubmit}
            onCancel={handleBulkFormCancel}
            products={PRODUCTS}
            demoConductors={DEMO_CONDUCTORS}
          />
        )}
      </div>
    </DashboardLayout>
  );
}