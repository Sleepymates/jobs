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
    id: 'token_option_1',
    priceId: 'price_1RkTpW2fD9xoCNc8saMFVfga', // Option 1 price ID
    name: 'Option 1',
    description: '10 tokens to view applicants',
    price: 1.00,
    tokens: 10,
    mode: 'payment'
  },
  {
    id: 'token_option_2',
    priceId: 'price_1RkiIr2fD9xoCNc8wjDp4i5p', // Option 2 price ID
    name: 'Option 2',
    description: '50 tokens to view applicants',
    price: 2.00,
    tokens: 50,
    mode: 'payment'
  },
  {
    id: 'token_option_3',
    priceId: 'price_1RkTq22fD9xoCNc8cCUs4cgB', // Option 3 price ID
    name: 'Option 3',
    description: '100 tokens to view applicants',
    price: 3.50,
    tokens: 100,
    mode: 'payment'
  },
  {
    id: 'token_option_4',
    priceId: 'price_1RkTqF2fD9xoCNc8FzsiwyJY', // Option 4 price ID
    name: 'Option 4',
    description: '200 tokens to view applicants',
    price: 6.00,
    tokens: 200,
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
  OPTION_1: { price: 1.00, tokens: 10 },
  OPTION_2: { price: 2.00, tokens: 50 },
  OPTION_3: { price: 3.50, tokens: 100 },
  OPTION_4: { price: 6.00, tokens: 200 },
  
  // System settings
  TOKENS_PER_APPLICANT_VIEW: 1,
  
  // Messages
  INSUFFICIENT_TOKENS_MESSAGE: "You need more tokens to view the remaining applications. Buy more tokens to continue.",
  LOCKED_APPLICANT_MESSAGE: "🔒 Locked - Purchase tokens to view"
};