import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import Button from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { type StripeProduct } from '../../stripe-config';
import { redirectToCheckout, formatPrice } from '../../utils/stripe';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: StripeProduct;
  isPopular?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isPopular = false, 
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      await redirectToCheckout(product);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className={`relative h-full ${isPopular ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
        {isPopular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          </div>
        )}
        
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {product.name}
          </CardTitle>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatPrice(product.price)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              /{product.mode === 'subscription' ? 'month' : 'one-time'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {product.description}
          </p>

          <div className="space-y-3 mb-6 flex-1">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              <span>Access to all features</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              <span>Priority support</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              <span>Regular updates</span>
            </div>
            {product.mode === 'subscription' && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            )}
          </div>

          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className={`w-full ${
              isPopular 
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
              `Subscribe to ${product.name}`
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;