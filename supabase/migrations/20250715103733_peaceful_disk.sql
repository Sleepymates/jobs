/*
  # Complete Token System Setup

  1. Tables
    - user_tokens: Store token balances per user
    - token_transactions: Track all token purchases and usage
    - applicant_views: Track which applicants have been viewed

  2. Functions
    - add_tokens_to_user: Add tokens after purchase
    - use_token: Deduct token when viewing applicant
    - get_user_token_info: Get current token balance

  3. Security
    - RLS policies for all tables
    - Proper user access controls
*/

-- Create user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  tokens_available integer DEFAULT 0 NOT NULL,
  tokens_used integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  transaction_type token_transaction_type NOT NULL,
  tokens_amount integer NOT NULL,
  stripe_session_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create applicant_views table
CREATE TABLE IF NOT EXISTS applicant_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  applicant_id bigint NOT NULL,
  job_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_email, applicant_id)
);

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tokens
CREATE POLICY "Users can view their own tokens" ON user_tokens
  FOR SELECT USING (email = current_setting('app.current_email', true));

CREATE POLICY "Allow token creation" ON user_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own tokens" ON user_tokens
  FOR UPDATE USING (email = current_setting('app.current_email', true));

-- RLS Policies for token_transactions
CREATE POLICY "Users can view their own transactions" ON token_transactions
  FOR SELECT USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow transaction creation" ON token_transactions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for applicant_views
CREATE POLICY "Users can view their own applicant views" ON applicant_views
  FOR SELECT USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow applicant view tracking" ON applicant_views
  FOR INSERT WITH CHECK (true);

-- Function to add tokens to user account
CREATE OR REPLACE FUNCTION add_tokens_to_user(
  user_email_param text,
  tokens_to_add integer,
  transaction_description text DEFAULT 'Token purchase',
  stripe_session_id_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user tokens
  INSERT INTO user_tokens (email, tokens_available, tokens_used, updated_at)
  VALUES (user_email_param, tokens_to_add, 0, now())
  ON CONFLICT (email)
  DO UPDATE SET 
    tokens_available = user_tokens.tokens_available + tokens_to_add,
    updated_at = now();

  -- Record the transaction
  INSERT INTO token_transactions (
    user_email, 
    transaction_type, 
    tokens_amount, 
    stripe_session_id, 
    description
  )
  VALUES (
    user_email_param, 
    'purchase', 
    tokens_to_add, 
    stripe_session_id_param, 
    transaction_description
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in add_tokens_to_user: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to use a token when viewing an applicant
CREATE OR REPLACE FUNCTION use_token(
  user_email_param text,
  applicant_id_param bigint,
  job_id_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_tokens integer;
  already_viewed boolean;
BEGIN
  -- Check if already viewed
  SELECT EXISTS(
    SELECT 1 FROM applicant_views 
    WHERE user_email = user_email_param 
    AND applicant_id = applicant_id_param
  ) INTO already_viewed;

  -- If already viewed, no token needed
  IF already_viewed THEN
    RETURN true;
  END IF;

  -- Check available tokens
  SELECT tokens_available INTO current_tokens
  FROM user_tokens
  WHERE email = user_email_param;

  -- If no tokens available, fail
  IF current_tokens IS NULL OR current_tokens < 1 THEN
    RETURN false;
  END IF;

  -- Deduct token
  UPDATE user_tokens
  SET 
    tokens_available = tokens_available - 1,
    tokens_used = tokens_used + 1,
    updated_at = now()
  WHERE email = user_email_param;

  -- Record the view
  INSERT INTO applicant_views (user_email, applicant_id, job_id)
  VALUES (user_email_param, applicant_id_param, job_id_param)
  ON CONFLICT (user_email, applicant_id) DO NOTHING;

  -- Record the transaction
  INSERT INTO token_transactions (
    user_email, 
    transaction_type, 
    tokens_amount, 
    description
  )
  VALUES (
    user_email_param, 
    'usage', 
    -1, 
    'Viewed applicant for job ' || job_id_param
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in use_token: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to get user token info
CREATE OR REPLACE FUNCTION get_user_token_info(user_email_param text)
RETURNS TABLE(
  tokens_available integer,
  tokens_used integer,
  total_purchased integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ut.tokens_available, 0) as tokens_available,
    COALESCE(ut.tokens_used, 0) as tokens_used,
    COALESCE(ut.tokens_available, 0) + COALESCE(ut.tokens_used, 0) as total_purchased
  FROM user_tokens ut
  WHERE ut.email = user_email_param;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0;
  END IF;
END;
$$;