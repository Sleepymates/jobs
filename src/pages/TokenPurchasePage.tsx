import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, CreditCard, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { TOKEN_PRODUCTS } from '../stripe-config';
import { createCheckoutSession } from '../utils/stripe';
import toast from 'react-hot-toast';

const TokenPurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get job data from navigation state
  const jobData = location.state?.jobData;

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if no job data
  useEffect(() => {
    if (!jobData) {
      navigate('/post');
    }
  }, [jobData, navigate]);

  const handlePurchase = async (product: typeof TOKEN_PRODUCTS[0]) => {
    setSelectedProduct(product.id);
    setIsProcessing(true);

    try {
      // Create success URL with job data and token info
      const successUrl = `${window.location.origin}/token-purchase-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(jobData.email)}&tokens=${product.tokens}&jobData=${encodeURIComponent(JSON.stringify(jobData))}`;
      const cancelUrl = `${window.location.origin}/token-purchase-cancel?jobData=${encodeURIComponent(JSON.stringify(jobData))}`;

      const session = await createCheckoutSession({
        priceId: product.priceId,
        successUrl,
        cancelUrl,
        mode: product.mode,
        quantity: 1,
        metadata: {
          user_email: jobData.email,
          tokens: product.tokens.toString(),
          product_type: 'tokens',
          job_data: JSON.stringify(jobData)
        }
      });

      // Redirect to Stripe checkout
      window.location.href = session.url;

    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
      setIsProcessing(false);
      setSelectedProduct(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (!jobData) {
    return null; // Will redirect
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

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <AnimatedTitle text="Choose Your Token Package" />
                <AnimatedSubtitle text="Purchase tokens to view applicants for your job posting" />
              </div>

              {/* Job Summary */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Job Ready to Post
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                      <p className="font-medium text-gray-900 dark:text-white">{jobData.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                      <p className="font-medium text-gray-900 dark:text-white">{jobData.companyName}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Next step:</strong> Purchase tokens to view applicants. Each token allows you to view one applicant's full details.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Token Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {TOKEN_PRODUCTS.map((product, index) => {
                  const isSelected = selectedProduct === product.id;
                  const isLoading = isProcessing && isSelected;
                  const isRecommended = index === 1; // Option 2 recommended

                  return (
                    <Card 
                      key={product.id} 
                      className={`relative cursor-pointer transition-all duration-200 ${
                        isRecommended ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                      } ${isSelected ? 'ring-2 ring-green-500' : ''} hover:shadow-lg`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Recommended
                          </span>
                        </div>
                      )}

                      <CardHeader className="text-center pb-3">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {product.name}
                        </CardTitle>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            one-time
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                              {product.tokens} tokens
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            View {product.tokens} applicants
                          </p>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            1 token = 1 applicant view
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Tokens never expire
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Use across all your jobs
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePurchase(product)}
                          disabled={isProcessing}
                          className={`w-full ${
                            isRecommended 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Purchase {product.tokens} Tokens
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Info Section */}
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    How tokens work:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li>• Each token allows you to view one applicant's full details</li>
                      <li>• Tokens are shared across all your job postings</li>
                      <li>• Once you view an applicant, you can access them again for free</li>
                    </ul>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li>• Tokens never expire and can be used anytime</li>
                      <li>• You can buy more tokens later if needed</li>
                      <li>• Secure payment processing via Stripe</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Back Button */}
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/post', { state: { jobData } })}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Edit Job
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TokenPurchasePage;