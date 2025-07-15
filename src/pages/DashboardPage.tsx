import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabaseClient';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import { Eye, Download, Search, Filter, Users, Clock, Star, ChevronDown, ChevronUp, Coins, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getUserTokens, useTokenForApplicant, getApplicantsWithViewStatus, calculateTokensNeeded } from '../utils/tokenUtils';
import TokenPurchaseModal from '../components/tokens/TokenPurchaseModal';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  custom_questions: string[];
  tags: string[];
  deadline: string;
  email: string;
  passcode: string;
  job_id: string;
  company_name: string;
  logo_url: string;
  notify_threshold: number;
  created_at: string;
  optional_fields: {
    age: boolean;
    location: boolean;
    education: boolean;
    work_type: boolean;
    working_hours: boolean;
  };
  header_image_url?: string;
}

interface Applicant {
  id: number;
  job_id: string;
  name: string;
  age?: number;
  location?: string;
  education?: string;
  cv_url: string;
  motivation_text?: string;
  followup_questions?: string[];
  followup_answers?: string[];
  ai_score?: number;
  ai_summary?: string;
  created_at: string;
  email: string;
  phone: string;
  linkedin_url?: string;
  working_hours?: number;
  work_type?: string;
  has_viewed?: boolean;
  can_view?: boolean;
  requires_token?: boolean;
}

interface TokenInfo {
  tokensAvailable: number;
  tokensUsed: number;
}

const DashboardPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokensNeeded, setTokensNeeded] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedPasscode = localStorage.getItem('userPasscode');
    
    if (storedEmail && storedPasscode) {
      setEmail(storedEmail);
      setPasscode(storedPasscode);
    }
  }, []);

  useEffect(() => {
    if (email && passcode && jobId && !authError) {
      fetchJobAndApplicants();
      fetchAllUserJobs();
      fetchTokenInfo();
    }
  }, [email, passcode, jobId, authError]);

  const fetchTokenInfo = async () => {
    if (!email) return;
    
    try {
      // Simple fallback if RPC functions don't exist yet
      const { data, error } = await supabase
        .from('user_tokens')
        .select('tokens_available, tokens_used')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not "not found" error
        console.error('Error fetching tokens:', error);
        setTokenInfo({ tokensAvailable: 0, tokensUsed: 0 });
        return;
      }
      
      if (data) {
        setTokenInfo({
          tokensAvailable: data.tokens_available || 0,
          tokensUsed: data.tokens_used || 0
        });
      } else {
        // User doesn't exist in tokens table yet
        setTokenInfo({ tokensAvailable: 0, tokensUsed: 0 });
      }
    } catch (error) {
      console.error('Error fetching token info:', error);
      setTokenInfo({ tokensAvailable: 0, tokensUsed: 0 });
    }
  };

  const fetchJobAndApplicants = async () => {
    if (!email || !passcode || !jobId) return;

    try {
      setLoading(true);
      setAuthError(null);

      // Set RLS context
      try {
        await supabase.rpc('set_user_context', {
          user_email: email,
          user_passcode: passcode
        });
      } catch (contextError) {
        console.warn('RLS context function not available, continuing without it');
      }

      try {
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .eq('email', email)
          .eq('passcode', passcode)
          .single();

        if (jobError) {
          console.error('Error fetching job:', jobError);
          setAuthError('Job not found or access denied. Please check your credentials.');
          setLoading(false);
          return;
        }

        setJob(jobData);

        // Fetch applicants with view status
        try {
          const applicantsData = await getApplicantsWithViewStatus(jobId, email);
          setApplicants(applicantsData);
        } catch (applicantError) {
          console.warn('Error fetching applicants with view status, using fallback');
          // Fallback: fetch basic applicants
          const { data: basicApplicants } = await supabase
            .from('applicants')
            .select('*')
            .eq('job_id', jobId);
          
          setApplicants(basicApplicants || []);
        }
        
        // Calculate tokens needed for remaining applicants
        setTokensNeeded(0); // Will be calculated after applicants load
        
        console.log('Applicants loaded:', applicantsData.length);
        console.log('Tokens needed for remaining:', needed);
        
      } catch (error) {
        console.error('Error in fetchJobAndApplicants:', error);
        setAuthError('Error loading dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in fetchJobAndApplicants:', error);
      setAuthError('Error loading dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplicant = async (applicant: Applicant) => {
    // If already viewed, show immediately
    if (applicant.has_viewed) {
      setSelectedApplicant(applicant);
      return;
    }

    // Simple fallback if token system isn't set up yet
    if (!tokenInfo) {
      setSelectedApplicant(applicant);
      toast.success('Applicant details loaded');
      return;
    }

    // If no tokens available, show purchase modal
    if (!tokenInfo || tokenInfo.tokensAvailable <= 0) {
      setShowTokenModal(true);
      return;
    }

    // Use token to view applicant
    try {
      let success = false;
      try {
        success = await useTokenForApplicant(email, applicant.id, jobId!);
      } catch (tokenError) {
        console.warn('Token system not available, allowing free view');
        success = true;
      }
      
      if (success) {
        // Update applicant status
        setApplicants(prevApplicants => 
          prevApplicants.map(app => 
            app.id === applicant.id 
              ? { ...app, has_viewed: true, can_view: true, requires_token: false }
              : app
          )
        );

        // Refresh token info
        await fetchTokenInfo();
        
        // Update tokens needed
        const updatedNeeded = calculateTokensNeeded(
          applicants.map(app => 
            app.id === applicant.id 
              ? { ...app, has_viewed: true }
              : app
          )
        );
        setTokensNeeded(updatedNeeded);
        
        // Show applicant
        setSelectedApplicant({ ...applicant, has_viewed: true });
        
        toast.success('Token used - applicant unlocked!');
      } else {
        toast.error('Failed to use token. Please try again.');
      }
    } catch (error) {
      console.error('Error using token:', error);
      toast.error('Error using token');
    }
  };

  const fetchAllUserJobs = async () => {
    if (!email || !passcode) return;

    try {
      // Try the RPC function first
      let data, error;
      try {
        const result = await supabase
          .rpc('validate_login', {
            email_address: email,
            passcode_input: passcode
          });
        data = result.data;
        error = result.error;
      } catch (rpcError) {
        console.warn('RPC function not available, using direct query');
        const result = await supabase
          .from('jobs')
          .select('*')
          .eq('email', email)
          .eq('passcode', passcode);
        data = result.data;
        error = result.error;
      }
      
      if (!error && data && data.length > 0) {
        setAllJobs(data);
      }
    } catch (error) {
      console.error('Error fetching user jobs:', error);
    }
  };

  const filteredAndSortedApplicants = applicants
    .filter(applicant => {
      const matchesSearch = applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           applicant.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScore = filterScore === null || (applicant.ai_score && applicant.ai_score >= filterScore);
      return matchesSearch && matchesScore;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'score':
          comparison = (a.ai_score || 0) - (b.ai_score || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const downloadCV = async (cvUrl: string, applicantName: string) => {
    try {
      const response = await fetch(cvUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${applicantName}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CV:', error);
      toast.error('Error downloading CV');
    }
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number | undefined) => {
    if (!score) return null;
    if (score >= 80) return <Star className="w-4 h-4 text-green-600 fill-current" />;
    if (score >= 60) return <Star className="w-4 h-4 text-yellow-600 fill-current" />;
    return <Star className="w-4 h-4 text-red-600" />;
  };

  const getButtonText = (applicant: Applicant) => {
    if (applicant.has_viewed) {
      return "View Details";
    }
    if (!tokenInfo || tokenInfo.tokensAvailable <= 0) {
      return "🔒 Buy Tokens";
    }
    return "🔒 Use 1 Token";
  };

  const getButtonColor = (applicant: Applicant) => {
    if (applicant.has_viewed) {
      return "bg-blue-600 hover:bg-blue-700";
    }
    if (!tokenInfo || tokenInfo.tokensAvailable <= 0) {
      return "bg-red-600 hover:bg-red-700";
    }
    return "bg-amber-600 hover:bg-amber-700";
  };

  // Show error state if authentication failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Error</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button 
            onClick={() => navigate('/forgot')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Job ID: {jobId}</p>
          <button 
            onClick={() => {
              setAuthError(null);
              setLoading(false);
              navigate('/forgot');
            }}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Having trouble? Go to login
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Job Not Found</h2>
          <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{job.company_name}</h1>
              <span className="text-gray-500">•</span>
              <h2 className="text-xl text-gray-700">{job.title}</h2>
            </div>
            
            {/* Token Display */}
            <div className="flex items-center space-x-4">
              {tokenInfo && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <Coins className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {tokenInfo.tokensAvailable} tokens available
                  </span>
                </div>
              )}
              
              {tokensNeeded > 0 && (
                <Button
                  onClick={() => setShowTokenModal(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy {tokensNeeded} More Tokens
                </Button>
              )}
              
              <select
                value={jobId}
                onChange={(e) => navigate(`/dashboard/${e.target.value}`)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allJobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.title} ({j.company_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Info & Applicants List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{applicants.length}</p>
                    <p className="text-sm text-gray-600">Total Applicants</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <Eye className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {applicants.filter(a => a.has_viewed).length}
                    </p>
                    <p className="text-sm text-gray-600">Viewed</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <Coins className="w-8 h-8 text-amber-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {tokensNeeded}
                    </p>
                    <p className="text-sm text-gray-600">Tokens Needed</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search applicants by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'score')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="date">Application Date</option>
                        <option value="name">Name</option>
                        <option value="score">AI Score</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
                      <select
                        value={filterScore || ''}
                        onChange={(e) => setFilterScore(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Scores</option>
                        <option value="80">80+ (Excellent)</option>
                        <option value="70">70+ (Good)</option>
                        <option value="60">60+ (Average)</option>
                        <option value="50">50+ (Below Average)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Applicants List */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Applicants ({filteredAndSortedApplicants.length})
              </h3>
              
              {filteredAndSortedApplicants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No applicants found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAndSortedApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedApplicant?.id === applicant.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">{applicant.name}</h4>
                            {getScoreIcon(applicant.ai_score)}
                            <span className={`text-sm font-medium ${getScoreColor(applicant.ai_score)}`}>
                              {applicant.ai_score ? `${applicant.ai_score}/100` : 'Not scored'}
                            </span>
                            {applicant.has_viewed && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Viewed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{applicant.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Applied {new Date(applicant.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleViewApplicant(applicant)}
                            className={getButtonColor(applicant)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {getButtonText(applicant)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Selected Applicant Details */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              {selectedApplicant ? (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{selectedApplicant.name}</h3>
                      {getScoreIcon(selectedApplicant.ai_score)}
                    </div>
                    <p className="text-sm text-gray-600">{selectedApplicant.email}</p>
                    <p className="text-sm text-gray-600">{selectedApplicant.phone}</p>
                    {selectedApplicant.linkedin_url && (
                      <a
                        href={selectedApplicant.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    )}
                  </div>

                  {selectedApplicant.ai_score && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">AI Assessment</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-lg font-bold ${getScoreColor(selectedApplicant.ai_score)}`}>
                          {selectedApplicant.ai_score}/100
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedApplicant.ai_score >= 80 ? 'bg-green-600' :
                              selectedApplicant.ai_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${selectedApplicant.ai_score}%` }}
                          ></div>
                        </div>
                      </div>
                      {selectedApplicant.ai_summary && (
                        <p className="text-sm text-gray-700">{selectedApplicant.ai_summary}</p>
                      )}
                    </div>
                  )}

                  {job.optional_fields.age && selectedApplicant.age && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Age</h4>
                      <p className="text-sm text-gray-700">{selectedApplicant.age} years old</p>
                    </div>
                  )}

                  {job.optional_fields.location && selectedApplicant.location && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Location</h4>
                      <p className="text-sm text-gray-700">{selectedApplicant.location}</p>
                    </div>
                  )}

                  {job.optional_fields.education && selectedApplicant.education && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Education</h4>
                      <p className="text-sm text-gray-700">{selectedApplicant.education}</p>
                    </div>
                  )}

                  {job.optional_fields.work_type && selectedApplicant.work_type && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Work Type</h4>
                      <p className="text-sm text-gray-700">{selectedApplicant.work_type}</p>
                    </div>
                  )}

                  {job.optional_fields.working_hours && selectedApplicant.working_hours && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Working Hours</h4>
                      <p className="text-sm text-gray-700">{selectedApplicant.working_hours} hours/week</p>
                    </div>
                  )}

                  {selectedApplicant.motivation_text && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Motivation</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplicant.motivation_text}</p>
                    </div>
                  )}

                  {selectedApplicant.followup_questions && selectedApplicant.followup_answers && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Custom Questions</h4>
                      <div className="space-y-3">
                        {selectedApplicant.followup_questions.map((question, index) => (
                          <div key={index}>
                            <p className="text-sm font-medium text-gray-800">{question}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedApplicant.followup_answers?.[index] || 'No answer provided'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => downloadCV(selectedApplicant.cv_url, selectedApplicant.name)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CV
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select an applicant to view their details</p>
                  {tokensNeeded > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        You need {tokensNeeded} more tokens to view all remaining applicants.
                      </p>
                      <Button
                        onClick={() => setShowTokenModal(true)}
                        size="sm"
                        className="mt-2 bg-amber-600 hover:bg-amber-700"
                      >
                        Buy Tokens
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        userEmail={email}
        requiredTokens={tokensNeeded}
        onSuccess={() => {
          setShowTokenModal(false);
          fetchTokenInfo();
          fetchJobAndApplicants();
        }}
      />
    </div>
  );
};

export default DashboardPage;