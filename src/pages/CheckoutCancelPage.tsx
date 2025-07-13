import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';

const CheckoutCancelPage: React.FC = () => {
  const navigate = useNavigate();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
                    className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-6"
                  >
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </motion.div>
                  
                  <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                    Checkout Cancelled
                  </CardTitle>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    Your payment was cancelled. No charges have been made to your account.
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      What happened?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You cancelled the checkout process before completing your payment. 
                      Your subscription was not activated and no payment was processed.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      What would you like to do?
                    </h4>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={() => navigate('/#pricing')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      
                      <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                        className="w-full"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p>
                      If you experienced any issues during checkout, please contact our support team 
                      and we'll be happy to help you complete your subscription.
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

export default CheckoutCancelPage;