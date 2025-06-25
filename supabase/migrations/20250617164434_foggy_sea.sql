/*
  # Fix Stripe Integration - Remove Duplicate Migration
  
  This migration was a duplicate of 20250610204638_shiny_lantern.sql
  Since the Stripe tables already exist, we'll just ensure everything is properly set up
  without recreating existing objects.
  
  1. Check and update existing policies if needed
  2. Ensure views are properly configured
  3. No table recreation to avoid conflicts
*/

-- Ensure the views exist with proper security settings
DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;

-- Recreate user subscriptions view with proper security
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND (s.deleted_at IS NULL OR s.deleted_at IS NULL);

-- Recreate user orders view with proper security
CREATE VIEW stripe_user_orders WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND (o.deleted_at IS NULL OR o.deleted_at IS NULL);

-- Grant permissions on views
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_orders TO authenticated;

-- Ensure RLS policies are properly set (these will only create if they don't exist)
DO $$
BEGIN
    -- Check if customer policy exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_customers' 
        AND policyname = 'Users can view their own customer data'
    ) THEN
        CREATE POLICY "Users can view their own customer data"
            ON stripe_customers
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid() AND deleted_at IS NULL);
    END IF;

    -- Check if subscription policy exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_subscriptions' 
        AND policyname = 'Users can view their own subscription data'
    ) THEN
        CREATE POLICY "Users can view their own subscription data"
            ON stripe_subscriptions
            FOR SELECT
            TO authenticated
            USING (
                customer_id IN (
                    SELECT customer_id
                    FROM stripe_customers
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
                AND deleted_at IS NULL
            );
    END IF;

    -- Check if orders policy exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stripe_orders' 
        AND policyname = 'Users can view their own order data'
    ) THEN
        CREATE POLICY "Users can view their own order data"
            ON stripe_orders
            FOR SELECT
            TO authenticated
            USING (
                customer_id IN (
                    SELECT customer_id
                    FROM stripe_customers
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
                AND deleted_at IS NULL
            );
    END IF;
END
$$;