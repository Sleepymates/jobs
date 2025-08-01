import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Check if this is a token purchase
        const metadata = (stripeData as Stripe.Checkout.Session).metadata;
        const isTokenPurchase = metadata?.product_type === 'tokens';
        
        if (isTokenPurchase && metadata?.user_email && metadata?.tokens) {
          console.info(`Processing token purchase for ${metadata.user_email}: ${metadata.tokens} tokens`);
          
          const { id: checkout_session_id, amount_total } = stripeData as Stripe.Checkout.Session;
          
          try {
            console.log('🎯 Processing token purchase:', {
              user_email_param: metadata.user_email,
              tokens_to_add: parseInt(metadata.tokens),
              stripe_session_id_param: checkout_session_id,
              amount_paid: amount_total
            });
            
            // Add tokens to user account
            const { data: result, error: tokenError } = await supabase.rpc('add_tokens_to_user', {
              user_email_param: metadata.user_email,
              tokens_to_add: parseInt(metadata.tokens),
              stripe_session_id_param: checkout_session_id,
              description_param: `Stripe purchase - ${metadata.tokens} tokens ($${(amount_total / 100).toFixed(2)})`
            });
          
            console.log('🔍 Token addition result:', { result, tokenError });
            
            if (tokenError) {
              console.error('❌ Error adding tokens:', tokenError);
              throw tokenError;
            }
            
            if (result !== true) {
              console.error('❌ Token addition failed - function returned:', result);
              throw new Error('Token addition function returned false');
            }
            
            console.info(`✅ Successfully added ${metadata.tokens} tokens to ${metadata.user_email}`);
            
            // Verify tokens were actually added
            console.log('🔍 Verifying token addition...');
            const { data: verifyData, error: verifyError } = await supabase.rpc('get_user_tokens', {
              user_email_param: metadata.user_email
            });
            
            if (!verifyError && verifyData && verifyData.length > 0) {
              const tokenBalance = verifyData[0];
              console.info(`✅ Verification successful: User ${metadata.user_email} now has ${tokenBalance.tokens_available} tokens available`);
            } else {
              console.warn('⚠️ Token verification failed:', verifyError);
            }
            
          } catch (error) {
            console.error('❌ Failed to process token purchase:', error);
            
            // Try to log the error for debugging
            try {
              await supabase.from('token_transactions').insert({
                user_email: metadata.user_email,
                transaction_type: 'purchase',
                tokens_amount: parseInt(metadata.tokens),
                stripe_session_id: checkout_session_id,
                description: `FAILED: Stripe purchase - ${metadata.tokens} tokens - Error: ${error.message}`
              });
            } catch (logError) {
              console.error('Failed to log error transaction:', logError);
            }
          }
        }
        
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}