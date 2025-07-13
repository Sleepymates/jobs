export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  mode: 'payment' | 'subscription';
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_SfpVF5oFEquJAm',
    priceId: 'price_1RkTqF2fD9xoCNc8FzsiwyJY',
    name: 'Option 4',
    description: 'Premium subscription plan with advanced features',
    price: 0.50,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpVuDKklvKzaM',
    priceId: 'price_1RkTq22fD9xoCNc8cCUs4cgB',
    name: 'Option 3',
    description: 'Professional subscription plan with enhanced capabilities',
    price: 0.50,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpUN7s5gyKAh6',
    priceId: 'price_1RkTpm2fD9xoCNc8StYO7TyK',
    name: 'Option 2',
    description: 'Standard subscription plan with core features',
    price: 0.50,
    mode: 'subscription'
  },
  {
    id: 'prod_SfpUfleovsYLGR',
    priceId: 'price_1RkTpW2fD9xoCNc8saMFVfga',
    name: 'Option 1',
    description: 'Basic subscription plan with essential features',
    price: 0.50,
    mode: 'subscription'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.id === id);
};