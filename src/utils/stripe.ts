import { supabase } from '../supabase/supabaseClient';
import { STRIPE_PRODUCTS, type StripeProduct } from '../stripe-config';

interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'payment' | 'subscription';
  quantity?: number;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  mode,
  quantity = 1
}: CreateCheckoutSessionParams): Promise<CheckoutSessionResponse> {
  try {
    console.log('Creating checkout session with params:', {
      priceId,
      mode,
      quantity,
      successUrl,
      cancelUrl
    });

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode,
        quantity
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }

    if (!data || !data.sessionId || !data.url) {
      console.error('Invalid response from checkout function:', data);
      throw new Error('Invalid response from checkout service');
    }

    console.log('Checkout session created successfully:', data.sessionId);
    return data;

  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Redirect to Stripe checkout
 */
export async function redirectToCheckout(product: StripeProduct): Promise<void> {
  try {
    const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/checkout/cancel`;

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
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

/**
 * Get user's active subscription
 */
export async function getUserSubscription() {
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const subscription = await getUserSubscription();
    return subscription && subscription.subscription_status === 'active';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get subscription plan name from price ID
 */
export function getSubscriptionPlanName(priceId: string): string {
  const product = STRIPE_PRODUCTS.find(p => p.priceId === priceId);
  return product ? product.name : 'Unknown Plan';
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}