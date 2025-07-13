import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, CreditCard, Loader2 } from 'lucide-react';
import Button from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { TOKEN_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession } from '../../utils/stripe';
import toast from 'react-hot-toast';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  requiredTokens?: number;
  onSuccess?: () => void;
}

const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  requiredTokens,
  onSuccess
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (product: typeof TOKEN_PRODUCTS[0]) => {
    setSelectedProduct(product.id);
    setIsProcessing(true);

    try {
      const successUrl = `${window.location.origin}/token-purchase-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(userEmail)}&tokens=${product.tokens}`;
      const cancelUrl = `${window.location.origin}/token-purchase-cancel`;

      const session = await createCheckoutSession({
        priceId: product.priceId,
        successUrl,
        cancelUrl,
        mode: product.mode,
        quantity: 1
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

  const getRecommendedProduct = () => {
    if (!requiredTokens) return null;
    return TOKEN_PRODUCTS.find(product => product.tokens >= requiredTokens);
  };

  const recommendedProduct = getRecommendedProduct();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Purchase Tokens
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a token package to view applicants
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {requiredTokens && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-800 dark:text-amber-300">
                      You need {requiredTokens} more tokens
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    To view all remaining applicants, you need at least {requiredTokens} additional tokens.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TOKEN_PRODUCTS.map((product) => {
                  const isRecommended = recommendedProduct?.id === product.id;
                  const isSelected = selectedProduct === product.id;
                  const isLoading = isProcessing && isSelected;

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

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  How tokens work:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Each token allows you to view one applicant's full details</li>
                  <li>• Tokens are shared across all your job postings</li>
                  <li>• Once you view an applicant, you can access them again for free</li>
                  <li>• Tokens never expire and can be used anytime</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TokenPurchaseModal;