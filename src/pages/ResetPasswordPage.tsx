import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/button';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { supabase } from '../supabase/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');
      const emailParam = searchParams.get('email');
      
      if (!token || !emailParam) {
        setError('Invalid recovery link. Please request a new password recovery email.');
        setLoading(false);
        return;
      }

      try {
        // Fetch user's jobs to get password and company info
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('email', emailParam.toLowerCase().trim());
        
        if (jobsError) {
          throw jobsError;
        }
        
        if (!jobsData || jobsData.length === 0) {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }

        setEmail(emailParam);
        setPassword(jobsData[0].passcode);
        setCompanyName(jobsData[0].company_name);
        setJobs(jobsData);
        setLoading(false);
        
      } catch (error) {
        console.error('Error validating recovery token:', error);
        setError('An error occurred while validating your recovery link. Please try again.');
        setLoading(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Password copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleLoginAndRedirect = () => {
    // Log the user in automatically
    login(email, password);
    
    // Redirect to appropriate dashboard
    if (jobs.length === 1) {
      navigate(`/dashboard/${jobs[0].job_id}`);
    } else {
      // If multiple jobs, go to the forgot page which will show job selection
      navigate('/forgot');
    }
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

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-md w-full mx-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                {error ? (
                  <>
                    <CardHeader className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <CardTitle className="text-red-600 dark:text-red-400">
                        Recovery Link Invalid
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                        {error}
                      </p>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col gap-4">
                      <Button
                        onClick={() => navigate('/forgot')}
                        fullWidth
                      >
                        Request New Recovery Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        fullWidth
                      >
                        Return to Home
                      </Button>
                    </CardFooter>
                  </>
                ) : (
                  <>
                    <CardHeader className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <CardTitle className="text-green-600 dark:text-green-400">
                        Password Recovery Successful
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Here is your password for <strong>{companyName}</strong>:
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Your Password
                            </label>
                            <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                              {password}
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(password)}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Copy password"
                          >
                            {copiedPassword ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                          💡 Important
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Save this password securely. You'll need it to access your job dashboard and manage applications.
                        </p>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col gap-4">
                      <Button
                        onClick={handleLoginAndRedirect}
                        fullWidth
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Access Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        fullWidth
                      >
                        Return to Home
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResetPasswordPage;