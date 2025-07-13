import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Home, User } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { getUserSubscription, getSubscriptionPlanName } from '../utils/stripe';
import { useAuthStore } from '../store/authStore';

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuthStore();
  
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        if (isLoggedIn) {
          const userSubscription = await getUserSubscription();
          setSubscription(userSubscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to allow webhook processing
    const timer = setTimeout(fetchSubscription, 2000);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const planName = subscription?.price_id 
    ? getSubscriptionPlanName(subscription.price_id)
    : 'Your Plan';

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
                    Payment Successful!
                  </CardTitle>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    Thank you for your subscription. Your payment has been processed successfully.
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
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

                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        Loading subscription details...
                      </span>
                    </div>
                  ) : subscription ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                        Subscription Active
                      </h3>
                      <p className="text-blue-700 dark:text-blue-400 text-sm">
                        You're now subscribed to <strong>{planName}</strong>
                      </p>
                      {subscription.current_period_end && (
                        <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                          Next billing: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                        Subscription Activated
                      </h3>
                      <p className="text-green-700 dark:text-green-400 text-sm">
                        Your subscription is being processed and will be active shortly.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      What's Next?
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center mb-2">
                          <User className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            Access Features
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Start using all the premium features included in your plan
                        </p>
                      </div>
                      
                      <div className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            Manage Subscription
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Update billing details or cancel anytime from your account
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      onClick={() => navigate('/')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                    
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue Browsing
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p>
                      You will receive a confirmation email shortly. If you have any questions, 
                      please contact our support team.
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

export default CheckoutSuccessPage;