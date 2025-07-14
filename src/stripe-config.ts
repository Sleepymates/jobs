export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  tokens: number;
  mode: 'payment' | 'subscription';
}

// Token-based products for job posting
export const TOKEN_PRODUCTS: StripeProduct[] = [
  {
    id: 'sourcer',
    priceId: 'price_1Rkk5b2fD9xoCNc8BgeRva6J',
    name: 'Sourcer',
    description: '100 tokens to view applicants',
    price: 25.00,
    tokens: 100,
    mode: 'payment'
  },
  {
    id: 'recruiter',
    priceId: 'price_1RkiIr2fD9xoCNc8wjDp4i5p', // Option 2 price ID
    name: 'Recruiter',
    description: '300 tokens to view applicants',
    price: 75.00,
    tokens: 300,
    mode: 'payment'
  },
  {
    id: 'hiring_pro',
    priceId: 'price_1RkTq22fD9xoCNc8cCUs4cgB', // Option 3 price ID
    name: 'Hiring Pro',
    description: '600 tokens to view applicants',
    price: 150.00,
    tokens: 600,
    mode: 'payment'
  },
  {
    id: 'chief_talent',
    priceId: 'price_1Rkk4v2fD9xoCNc8Jev6K56x',
    name: 'Chief Talent',
    description: '1000 tokens to view applicants',
    price: 250.00,
    tokens: 1000,
    mode: 'payment'
  }
];

// Legacy subscription products (keeping for existing functionality)
export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_SfpVF5oFEquJAm',
    priceId: 'price_1RkTqF2fD9xoCNc8FzsiwyJY',
    name: 'Option 4',
    description: 'Premium subscription plan with advanced features',
    price: 0.50,
    tokens: 0,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpVuDKklvKzaM',
    priceId: 'price_1RkTq22fD9xoCNc8cCUs4cgB',
    name: 'Option 3',
    description: 'Professional subscription plan with enhanced capabilities',
    price: 0.50,
    tokens: 0,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpUN7s5gyKAh6',
    priceId: 'price_1RkTpm2fD9xoCNc8StYO7TyK',
    name: 'Option 2',
    description: 'Standard subscription plan with core features',
    price: 0.50,
    tokens: 0,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpUfleovsYLGR',
    priceId: 'price_1RkTpW2fD9xoCNc8saMFVfga',
    name: 'Option 1',
    description: 'Basic subscription plan with essential features',
    price: 0.50,
    tokens: 0,
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return [...TOKEN_PRODUCTS, ...STRIPE_PRODUCTS].find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return [...TOKEN_PRODUCTS, ...STRIPE_PRODUCTS].find(product => product.id === id);
};

export const getTokenProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return TOKEN_PRODUCTS.find(product => product.priceId === priceId);
};

// Configuration for easy adjustment
export const TOKEN_CONFIG = {
  // Token pricing (easily adjustable)
  SOURCER: { price: 25.00, tokens: 100 },
  RECRUITER: { price: 75.00, tokens: 300 },
  HIRING_PRO: { price: 150.00, tokens: 600 },
  CHIEF_TALENT: { price: 250.00, tokens: 1000 },
  
  // System settings
  TOKENS_PER_APPLICANT_VIEW: 1,
  
  // Messages
  INSUFFICIENT_TOKENS_MESSAGE: "You need more tokens to view the remaining applications. Buy more tokens to continue.",
  LOCKED_APPLICANT_MESSAGE: "🔒 Locked - Purchase tokens to view"
};