import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Briefcase, MapPin, Calendar, Tag } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { supabase } from '../supabase/supabaseClient';
import { generateJobUrl } from '../utils/urlHelpers';

const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const now = new Date().toISOString();
        
        // Fetch jobs that are not expired
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .or(`deadline.gt.${now},deadline.is.null`)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw new Error('Failed to fetch jobs');
        }
        
        setJobs(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again.');
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, []);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleApplyClick = (job: any) => {
    const jobUrl = generateJobUrl(job.company_name, job.title, job.job_id);
    navigate(jobUrl);
  };
  
  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company_name?.toLowerCase().includes(query) ||
      job.description?.toLowerCase().includes(query) ||
      (job.tags && job.tags.some((tag: string) => tag.toLowerCase().includes(query)))
    );
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
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
            <div className="text-center">
              <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-4">Error</h1>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <motion.h1 
                className="text-5xl md:text-7xl font-bold tracking-tight mb-4 flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
                  Available Jobs
                </span>
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 dark:text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Browse and apply for open positions
              </motion.p>
            </div>
          
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </span>
              <input
                type="text"
                className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Search jobs by title, company, or keywords..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
          
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.job_id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center mb-4 md:mb-0">
                        {job.logo_url ? (
                          <img 
                            src={job.logo_url} 
                            alt={`${job.company_name} logo`}
                            className="h-12 w-12 object-contain rounded-md mr-4"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center mr-4">
                            <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h2>
                          <p className="text-gray-600 dark:text-gray-400">{job.company_name}</p>
                        </div>
                      </div>
                      
                      <Button onClick={() => handleApplyClick(job)}>
                        Apply Now
                      </Button>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
                        {job.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {job.tags && job.tags.map((tag: string, index: number) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        
                        {job.deadline && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                            <Calendar className="h-3 w-3 mr-1" />
                            Deadline: {formatDate(job.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No jobs found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery 
                  ? `No jobs matching "${searchQuery}". Try a different search term.`
                  : "There are no active job listings at the moment."}
              </p>
              <Button onClick={() => navigate('/post')}>
                Post a Job
              </Button>
            </div>
          )}
        </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default JobsListPage;