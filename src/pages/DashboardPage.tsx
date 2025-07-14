import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Download, UserCheck, Eye, Users, 
  ArrowUpDown, ChevronDown, ChevronUp, Bell, PlusCircle,
  Grid3X3, Building, Calendar, ArrowLeft, MoreHorizontal,
  ExternalLink, Share2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { supabase } from '../supabase/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { generateJobUrl } from '../utils/urlHelpers';
import toast from 'react-hot-toast';
import { getUserTokenInfo } from '../utils/tokenUtils';
import TokenPurchaseModal from '../components/tokens/TokenPurchaseModal';
import TokenDisplay from '../components/tokens/TokenDisplay';

const DashboardPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { email, passcode, isLoggedIn } = useAuthStore();
  
  const [job, setJob] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [showJobSwitcher, setShowJobSwitcher] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('ai_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [notifyThreshold, setNotifyThreshold] = useState<number>(0);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [hasPostedJob, setHasPostedJob] = useState(false);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isLoggedIn || !email || !passcode) {
      navigate('/forgot');
      return;
    }
  }, [isLoggedIn, email, passcode, navigate]);
  
  useEffect(() => {
    if (isLoggedIn && email && passcode) {
      fetchJobData();
      fetchAllUserJobs();
      fetchTokenInfo();
      setHasPostedJob(false); // Reset when component mounts
    }
  }, [jobId, isLoggedIn, email, passcode]);
  
  const fetchTokenInfo = async () => {
    if (!email) return;
    
    try {
      const tokens = await getUserTokenInfo(email);
      setTokenInfo(tokens);
      console.log('Token info fetched:', tokens);
    } catch (error) {
      console.error('Error fetching token info:', error);
    }
  };

  const fetchJobData = async () => {
    if (!email || !passcode || !jobId) return;

    try {
      // First validate the user has access to this job
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_login', {
          email_address: email,
          passcode_input: passcode
        });
      
      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Authentication failed');
      }

      // Check if the user has access to this specific job
      const hasAccess = validationData.some((userJob: any) => userJob.job_id === jobId);
      if (!hasAccess) {
        throw new Error('You do not have access to this job');
      }

      // Get the specific job data
      const currentJob = validationData.find((userJob: any) => userJob.job_id === jobId);
      if (!currentJob) {
        throw new Error('Job not found');
      }

      setJob(currentJob);
      setNotifyThreshold(currentJob.notify_threshold || 0);
      
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      
      if (applicantsError) {
        throw new Error('Failed to fetch applicants');
      }
      
      setApplicants(applicantsData || []);
      
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics')
        .select('*')
        .eq('job_id', jobId)
        .single();
      
      if (!analyticsError) {
        setAnalytics(analyticsData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const fetchAllUserJobs = async () => {
    if (!email || !passcode) return;

    try {
      const { data, error } = await supabase
        .rpc('validate_login', {
          email_address: email,
          passcode_input: passcode
        });
      
      if (!error && data && data.length > 0) {
        setAllJobs(data);
      }
    } catch (error) {
      console.error('Error fetching user jobs:', error);
    }
  };
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleNotifyThresholdChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const threshold = parseInt(e.target.value, 10);
    setNotifyThreshold(threshold);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ notify_threshold: threshold })
        .eq('job_id', jobId);
      
      if (error) {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error updating notification threshold:', error);
      setNotifyThreshold(job.notify_threshold || 0);
    }
  };
  
  const handleExportCSV = () => {
    if (!applicants.length) return;
    
    const headers = ['Name', 'Age', 'Location', 'Education', 'AI Score', 'Summary'];
    
    const csvContent = [
      headers.join(','),
      ...applicants.map(applicant => [
        `"${applicant.name || ''}"`,
        applicant.age || '',
        `"${applicant.location || ''}"`,
        `"${applicant.education || ''}"`,
        applicant.ai_score || '',
        `"${applicant.ai_summary?.replace(/"/g, '""') || ''}"`,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${job.title}-applicants.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewJobPost = () => {
    if (!job) return;
    
    const jobUrl = generateJobUrl(job.company_name, job.title, job.job_id);
    const fullUrl = `${window.location.origin}${jobUrl}`;
    
    // Open in new tab
    window.open(fullUrl, '_blank');
  };

  const handleShareJobPost = async () => {
    if (!job) return;
    
    const jobUrl = generateJobUrl(job.company_name, job.title, job.job_id);
    const fullUrl = `${window.location.origin}${jobUrl}`;
    
    try {
      if (navigator.share) {
        // Use native share API if available
        await navigator.share({
          title: `${job.title} at ${job.company_name}`,
          text: `Check out this job opportunity: ${job.title} at ${job.company_name}`,
          url: fullUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Job link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing job:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Job link copied to clipboard!');
      } catch (clipboardError) {
        toast.error('Failed to copy job link');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const filteredApplicants = applicants
    .filter(applicant => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        applicant.name?.toLowerCase().includes(query) ||
        applicant.location?.toLowerCase().includes(query) ||
        applicant.education?.toLowerCase().includes(query) ||
        applicant.ai_summary?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      if (valueA === null || valueA === undefined) valueA = sortField === 'ai_score' ? 0 : '';
      if (valueB === null || valueB === undefined) valueB = sortField === 'ai_score' ? 0 : '';
      
      if (typeof valueA === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = valueA - valueB;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-600 dark:border-gray-500 rounded-full border-t-transparent"></div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        <Header />
        <main className="flex-grow py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-500">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{error}</p>
                <Button className="mt-4" onClick={() => navigate('/forgot')}>
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header companyLogo={job?.logo_url} companyName={job?.company_name} />
      
      <main className="flex-grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with job switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex-1">
              {/* Token Display */}
              {tokenInfo && tokenInfo.tokensAvailable > 0 && (
                <div className="mb-4">
                  <TokenDisplay
                    tokensAvailable={tokenInfo.tokensAvailable}
                    tokensUsed={tokenInfo.tokensUsed}
                    onPurchaseClick={() => setShowTokenModal(true)}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-2">
                {allJobs.length > 1 && (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJobSwitcher(!showJobSwitcher)}
                      className="flex items-center gap-2"
                    >
                      <Grid3X3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Switch Job ({allJobs.length})</span>
                      <span className="sm:hidden">{allJobs.length}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showJobSwitcher ? 'rotate-180' : ''}`} />
                    </Button>

                    {showJobSwitcher && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                            Your Jobs
                          </div>
                          {allJobs.map((userJob) => (
                            <button
                              key={userJob.job_id}
                              onClick={() => {
                                navigate(`/dashboard/${userJob.job_id}`);
                                setShowJobSwitcher(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                userJob.job_id === jobId ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {userJob.logo_url ? (
                                  <img
                                    src={userJob.logo_url}
                                    alt={`${userJob.company_name} logo`}
                                    className="h-8 w-8 object-contain rounded"
                                  />
                                ) : (
                                  <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <Building className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white truncate">
                                    {userJob.title}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {userJob.company_name} • {formatDate(userJob.created_at)}
                                  </div>
                                </div>
                                {userJob.job_id === jobId && (
                                  <div className="text-blue-500 text-xs font-medium">Current</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {job.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{job.company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Posted {formatDate(job.created_at)}</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Calendar className="h-4 w-4" />
                    <span>Deadline: {formatDate(job.deadline)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Job Post Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleViewJobPost}
                  className="flex items-center gap-2"
                  title="View job post as applicants see it"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">View Job Post</span>
                  <span className="sm:hidden">View Post</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleShareJobPost}
                  className="flex items-center gap-2"
                  title="Share job post link"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </div>
              
              <Button
                onClick={() => navigate('/post')}
                className="bg-blue-600 hover:bg-blue-700"
                icon={<PlusCircle className="h-4 w-4 mr-2" />}
              >
                <span className="hidden sm:inline">Post New Job</span>
                <span className="sm:hidden">New Job</span>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900 mr-4">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Applicants</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.applicant_count || applicants.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-teal-100 dark:bg-teal-900 mr-4">
                    <Eye className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.views || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900 mr-4">
                    <UserCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Score</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {applicants.length 
                        ? Math.round(applicants.reduce((acc, curr) => acc + (curr.ai_score || 0), 0) / applicants.length) 
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search applicants..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-auto">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <select
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={notifyThreshold}
                      onChange={handleNotifyThresholdChange}
                    >
                      <option value="0">No notifications</option>
                      <option value="25">Notify on 25%+ match</option>
                      <option value="50">Notify on 50%+ match</option>
                      <option value="75">Notify on 75%+ match</option>
                      <option value="100">Notify on 100% match only</option>
                    </select>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  disabled={!applicants.length}
                  icon={<Download className="h-4 w-4" />}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        <span>Name</span>
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4 ml-1" /> : 
                            <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center">
                        <span>Location</span>
                        {sortField === 'location' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4 ml-1" /> : 
                            <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('education')}
                    >
                      <div className="flex items-center">
                        <span>Education</span>
                        {sortField === 'education' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4 ml-1" /> : 
                            <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('ai_score')}
                    >
                      <div className="flex items-center">
                        <span>Match Score</span>
                        {sortField === 'ai_score' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4 ml-1" /> : 
                            <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApplicants.length > 0 ? (
                    filteredApplicants.map((applicant) => (
                      <tr 
                        key={applicant.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {applicant.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {applicant.age ? `Age: ${applicant.age}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {applicant.location || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {applicant.education || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`
                              h-6 rounded-full mr-2 text-xs font-medium text-white flex items-center justify-center px-2 min-w-[2.5rem]
                              ${applicant.ai_score >= 75 ? 'bg-green-500' : 
                                applicant.ai_score >= 50 ? 'bg-blue-500' : 
                                applicant.ai_score >= 25 ? 'bg-yellow-500' : 'bg-red-500'}
                            `}>
                              {applicant.ai_score || 0}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => setSelectedApplicant(applicant)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No applicants found matching your search.' : 'No applicants yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      {/* Applicant Details Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Applicant Details
              </h3>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedApplicant.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedApplicant.age && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2.5 py-0.5 rounded">
                          Age: {selectedApplicant.age}
                        </span>
                      )}
                      {selectedApplicant.location && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2.5 py-0.5 rounded">
                          {selectedApplicant.location}
                        </span>
                      )}
                      {selectedApplicant.education && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2.5 py-0.5 rounded">
                          {selectedApplicant.education}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0">
                    <div className={`
                      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                      ${selectedApplicant.ai_score >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                        selectedApplicant.ai_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 
                        selectedApplicant.ai_score >= 25 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}
                    `}>
                      Match Score: {selectedApplicant.ai_score || 0}%
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedApplicant.ai_summary && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    AI Summary
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-gray-200">
                    {selectedApplicant.ai_summary}
                  </div>
                </div>
              )}
              
              {selectedApplicant.motivation_text && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Motivation Letter
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedApplicant.motivation_text}
                  </div>
                </div>
              )}
              
              {selectedApplicant.followup_questions && selectedApplicant.followup_answers && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Follow-up Questions & Answers
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
                    {selectedApplicant.followup_questions.map((question: string, index: number) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                          Q: {question}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          A: {selectedApplicant.followup_answers[index] || 'No answer provided'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <a
                  href={selectedApplicant.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CV
                </a>
                
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Purchase Modal */}
      {showTokenModal && email && (
        <TokenPurchaseModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          userEmail={email}
          onSuccess={() => {
            setShowTokenModal(false);
            fetchTokenInfo(); // Refresh token info
          }}
        />
      )}

      {/* Click outside to close job switcher */}
      {showJobSwitcher && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowJobSwitcher(false)}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default DashboardPage;