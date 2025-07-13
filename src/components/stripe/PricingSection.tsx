import React from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { AnimatedTitle, AnimatedSubtitle } from '../ui/typography';

interface PricingSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  title = "Choose Your Plan",
  subtitle = "Select the perfect subscription plan for your needs",
  className = ""
}) => {
  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <AnimatedTitle text={title} />
          <AnimatedSubtitle text={subtitle} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STRIPE_PRODUCTS.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              isPopular={index === 1} // Make Option 3 popular
            />
          ))}
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;