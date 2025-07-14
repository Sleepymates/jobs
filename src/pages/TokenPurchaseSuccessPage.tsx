import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Coins, ArrowRight, Home, ExternalLink } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { getUserTokenInfo } from '../utils/tokenUtils';
import { generateJobUrl } from '../utils/urlHelpers';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const TokenPurchaseSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [purchaseInfo, setPurchaseInfo] = useState<any>(null);
  const [jobPostResult, setJobPostResult] = useState<any>(null);

  const sessionId = searchParams.get('session_id');
  const email = searchParams.get('email');
  const tokens = searchParams.get('tokens');
  const jobDataParam = searchParams.get('jobData');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const processTokenPurchase = async () => {
      if (!sessionId || !email || !tokens || !jobDataParam) {
        toast.error('Invalid purchase information');
        navigate('/');
        return;
      }

      try {
        const tokensToAdd = parseInt(tokens, 10);
        const jobData = JSON.parse(decodeURIComponent(jobDataParam));
        
        // Set purchase info for display
        setPurchaseInfo({
          tokensAdded: tokensToAdd,
          sessionId
        });
        
        toast.success(`Payment successful! Adding tokens and posting your job...`);
        
        // Wait for webhook to process tokens
        console.log('Waiting for webhook to process tokens...');
        let attempts = 0;
        let tokensAdded = false;
        
        while (attempts < 6 && !tokensAdded) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const updatedTokenInfo = await getUserTokenInfo(email);
            if (updatedTokenInfo.tokensAvailable >= tokensToAdd) {
              setTokenInfo(updatedTokenInfo);
              tokensAdded = true;
              console.log('✅ Tokens successfully added to account');
              break;
            }
          } catch (error) {
            console.warn('Token check attempt failed:', error);
          }
          
          attempts++;
          console.log(`Checking tokens... attempt ${attempts}/6`);
        }
        
        if (!tokensAdded) {
          console.warn('⚠️ Tokens not detected after 6 seconds, proceeding anyway');
          // Still try to get token info for display
          try {
            const updatedTokenInfo = await getUserTokenInfo(email);
            setTokenInfo(updatedTokenInfo);
          } catch (error) {
            console.error('Failed to get token info:', error);
          }
        }
        
        // Now post the job
        console.log('Posting job after successful token purchase...');
        
        // Check if job was already posted to prevent duplicates
        if (jobPostResult) {
          console.log('Job already posted, skipping duplicate posting');
          return;
        }
        
        // Import and call the job posting function
        const { postJobToDatabase } = await import('../utils/jobPosting');
        const jobResult = await postJobToDatabase(jobData);
        
        if (jobResult.success) {
          setJobPostResult(jobResult);
          toast.success('Job posted successfully!');
          
          // Auto-login the user with their credentials
          const { login } = await import('../store/authStore');
          const authStore = useAuthStore.getState();
          authStore.login(jobData.email, jobData.passcode);
          
          console.log('✅ User automatically logged in');
          toast.success('You are now logged in to your dashboard!');
        } else {
          throw new Error('Failed to post job after payment');
        }
      } catch (error) {
        console.error('Error processing token purchase:', error);
        toast.error('Error processing your purchase. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    processTokenPurchase();
  }, [sessionId, email, tokens, jobDataParam, navigate]);

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

          <div className="relative z-10 max-w-2xl w-full mx-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center">
                <CardHeader className="pb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-6"
                  >
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </motion.div>
                  
                  <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    Tokens Purchased Successfully!
                  </CardTitle>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    Your tokens have been added to your account and are ready to use.
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {purchaseInfo && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                      <div className="flex items-center justify-center mb-4">
                        <Coins className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-lg">
                        +{purchaseInfo.tokensAdded} Tokens Added
                      </h3>
                      <p className="text-blue-700 dark:text-blue-400 text-sm">
                        You can now view {purchaseInfo.tokensAdded} applicants across all your job postings.
                      </p>
                    </div>
                  )}

                  {tokenInfo && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Your Token Balance
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-2xl text-blue-600 dark:text-blue-400">
                            {tokenInfo.tokensAvailable}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">Available</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-2xl text-gray-600 dark:text-gray-400">
                            {tokenInfo.tokensUsed}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">Used</div>
                        </div>
                      </div>
                    </div>
                  )}
                {jobPostResult && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2 text-lg">
                      🎉 Job Posted Successfully!
                    </h3>
                    <p className="text-green-700 dark:text-green-400 text-sm mb-4">
                      Your job is now live and ready to receive applications. You're automatically logged in to manage it.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          const jobUrl = generateJobUrl(jobData.companyName, jobData.title, jobPostResult.jobId);
                          window.open(`${window.location.origin}${jobUrl}`, '_blank');
                        }}
                        variant="outline"
                        className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Job Post
                      </Button>
                      <Button
                        onClick={() => navigate(`/dashboard/${jobPostResult.jobId}`)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                )}


                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      How to use your tokens:
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                      <li>• Go to your job dashboard to view applicants</li>
                      <li>• Each token allows you to view one applicant's full details</li>
                      <li>• Once viewed, you can access that applicant again for free</li>
                      <li>• Tokens work across all your job postings</li>
                    </ul>
                  </div>

                  {sessionId && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Transaction ID
                      </p>
                      <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                        {sessionId}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    {jobPostResult ? (
                      <Button
                        onClick={() => navigate(`/dashboard/${jobPostResult.jobId}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Manage Your Job
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate('/forgot')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Back to Home
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p>
                      You will receive a confirmation email shortly. Tokens never expire and can be used anytime.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TokenPurchaseSuccessPage;