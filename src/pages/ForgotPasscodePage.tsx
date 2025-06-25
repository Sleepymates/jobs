import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { supabase } from '../supabase/supabaseClient';
import { sendPasswordRecoveryWebhook } from '../utils/makeWebhook';
import { useAuthStore } from '../store/authStore';
import { Briefcase, Calendar, Users, Eye, ArrowRight, Building } from 'lucide-react';

const ForgotPasscodePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, email, passcode, login, logout } = useAuthStore();
  
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [jobs, setJobs] = useState<any[]>([]);
  const [showJobs, setShowJobs] = useState(false);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-fill email if passed from PostJobPage
  useEffect(() => {
    if (location.state?.email) {
      setFormEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoggedIn && email && passcode) {
        try {
          const { data, error: loginError } = await supabase
            .rpc('validate_login', {
              email_address: email,
              passcode_input: passcode
            });
          
          if (!loginError && data && data.length > 0) {
            if (data.length === 1) {
              navigate(`/dashboard/${data[0].job_id}`);
            } else {
              setJobs(data);
              setShowJobs(true);
            }
            return;
          } else {
            // Invalid session, logout
            logout();
          }
        } catch (error) {
          console.error('Error validating session:', error);
          logout();
        }
      }
    };

    checkAuth();
  }, [isLoggedIn, email, passcode, navigate, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formEmail.trim() || !formPassword.trim()) {
      setError('Email and password are required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { data, error: loginError } = await supabase
        .rpc('validate_login', {
          email_address: formEmail.trim(),
          passcode_input: formPassword.trim()
        });
      
      if (loginError) {
        throw loginError;
      }
      
      if (!data || data.length === 0) {
        setError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      login(formEmail.trim(), formPassword.trim());
      
      if (data.length > 1) {
        setJobs(data);
        setShowJobs(true);
      } else {
        navigate(`/dashboard/${data[0].job_id}`);
      }
      
    } catch (error) {
      console.error('Error during login:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formEmail.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(formEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('job_id, passcode, company_name')
        .eq('email', formEmail.toLowerCase().trim());
      
      if (jobsError) {
        throw jobsError;
      }
      
      if (!jobs || jobs.length === 0) {
        setError('No account found with this email address. Please check your email or create a new account.');
        return;
      }
      
      // Send recovery email with unique URL
      const success = await sendPasswordRecoveryWebhook(
        formEmail.trim(),
        jobs[0].passcode,
        jobs[0].company_name
      );
      
      if (success) {
        setSuccessMessage('Recovery email sent! Please check your inbox for a secure link to access your password.');
        setMode('login');
      } else {
        setError('Failed to send recovery email. Please try again later.');
      }
      
    } catch (error) {
      console.error('Error recovering password:', error);
      setError('An error occurred while sending the recovery email. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-4xl w-full mx-4">
            {!showJobs ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {mode === 'login' ? 'Dashboard Login' : 'Recover Password'}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={mode === 'login' ? handleLogin : handleRecovery}>
                      <Input
                        label="Email Address"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="your@email.com"
                        fullWidth
                        required
                      />
                      
                      {mode === 'login' && (
                        <Input
                          label="Password"
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="Enter your password"
                          fullWidth
                          required
                        />
                      )}

                      {error && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                          {error}
                        </div>
                      )}

                      {successMessage && (
                        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm">
                          {successMessage}
                        </div>
                      )}
                    </form>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      onClick={mode === 'login' ? handleLogin : handleRecovery}
                      isLoading={isSubmitting}
                      fullWidth
                    >
                      {mode === 'login' ? 'Login' : 'Send Recovery Email'}
                    </Button>
                    
                    <button
                      onClick={() => {
                        setMode(mode === 'login' ? 'recover' : 'login');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {mode === 'login' 
                        ? "Forgot your password?" 
                        : "Back to login"}
                    </button>
                  </CardFooter>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center mb-8">
                  <AnimatedTitle>Select a Job Dashboard</AnimatedTitle>
                  <AnimatedSubtitle>
                    You have {jobs.length} job{jobs.length > 1 ? 's' : ''} posted. Choose which one to manage.
                  </AnimatedSubtitle>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobs.map((job, index) => (
                    <motion.div
                      key={job.job_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                        <div 
                          onClick={() => navigate(`/dashboard/${job.job_id}`)}
                          className="p-6"
                        >
                          <div className="flex items-center mb-4">
                            {job.logo_url ? (
                              <img
                                src={job.logo_url}
                                alt={`${job.company_name} logo`}
                                className="h-12 w-12 object-contain rounded-lg mr-4"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                                <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
                                {job.company_name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Posted {formatDate(job.created_at)}
                              </p>
                            </div>
                          </div>

                          <h4 className="font-medium text-gray-900 dark:text-white mb-3 line-clamp-2">
                            {job.title}
                          </h4>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                            {job.description}
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Eye className="h-4 w-4 mr-2" />
                              <span>Views: --</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4 mr-2" />
                              <span>Applicants: --</span>
                            </div>
                          </div>

                          {job.tags && job.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {job.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                                <span
                                  key={tagIndex}
                                  className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {job.tags.length > 3 && (
                                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  +{job.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {job.deadline && (
                            <div className="flex items-center text-sm text-amber-600 dark:text-amber-400 mb-4">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>Deadline: {formatDate(job.deadline)}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {job.job_id}
                            </span>
                            <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              <span className="text-sm font-medium mr-2">Manage</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      logout();
                      setShowJobs(false);
                      setError('');
                      setSuccessMessage('');
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPasscodePage;