import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

// Disable JWT verification to allow unauthenticated access
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Check if Stripe secret key is available
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return corsResponse({ 
        error: 'Stripe configuration error: STRIPE_SECRET_KEY not found in environment variables' 
      }, 500);
    }

    if (!stripeSecret.startsWith('sk_')) {
      console.error('Invalid STRIPE_SECRET_KEY format');
      return corsResponse({ 
        error: 'Stripe configuration error: Invalid secret key format' 
      }, 500);
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(stripeSecret, {
      appInfo: {
        name: 'HellotoHire Integration',
        version: '1.0.0',
      },
    });

    const { price_id, success_url, cancel_url, mode, quantity = 1 } = await req.json();

    // Validate required parameters
    if (!price_id) {
      return corsResponse({ error: 'Missing required parameter: price_id' }, 400);
    }
    if (!success_url) {
      return corsResponse({ error: 'Missing required parameter: success_url' }, 400);
    }
    if (!cancel_url) {
      return corsResponse({ error: 'Missing required parameter: cancel_url' }, 400);
    }
    if (!mode || !['payment', 'subscription'].includes(mode)) {
      return corsResponse({ error: 'Invalid mode. Must be "payment" or "subscription"' }, 400);
    }

    console.log(`Creating checkout session with params:`, {
      price_id,
      mode,
      quantity,
      success_url,
      cancel_url
    });

    // Create checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: quantity,
        },
      ],
      mode,
      success_url,
      cancel_url,
      metadata: {
        quantity: quantity.toString(),
        product_type: 'cv_bulk_analyser',
        anonymous_purchase: 'true',
        timestamp: new Date().toISOString()
      },
      allow_promotion_codes: true,
    };

    console.log('Creating Stripe session with params:', JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Successfully created checkout session: ${session.id}`);
    console.log(`Session URL: ${session.url}`);

    return corsResponse({ 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error: any) {
    console.error(`Checkout error details:`, {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack
    });
    
    // Return more specific error information
    let errorMessage = 'Failed to create checkout session';
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Stripe API error: ${error.message}`;
      if (error.param) {
        errorMessage += ` (parameter: ${error.param})`;
      }
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed - check your secret key';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Stripe API temporarily unavailable';
    } else {
      errorMessage = `Unexpected error: ${error.message}`;
    }
    
    return corsResponse({ 
      error: errorMessage,
      details: error.message,
      type: error.type || 'unknown'
    }, 500);
  }
});