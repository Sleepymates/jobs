/*
  # Clean Token System for Applicant Viewing

  1. New Tables
    - `user_tokens` - Track token balance per user email
    - `token_transactions` - Log all token purchases and usage
    - `applicant_views` - Track which applicants user has viewed (to avoid double charging)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control

  3. Functions
    - `get_user_tokens` - Get user's current token balance
    - `use_token_for_applicant` - Deduct 1 token when viewing applicant
    - `add_tokens_to_user` - Add tokens after purchase
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_tokens CASCADE;
DROP TABLE IF EXISTS token_transactions CASCADE;
DROP TABLE IF EXISTS applicant_views CASCADE;

-- Create user_tokens table
CREATE TABLE user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  tokens_available integer DEFAULT 0 NOT NULL,
  tokens_used integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create token_transactions table
CREATE TABLE token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage')),
  tokens_amount integer NOT NULL,
  stripe_session_id text,
  applicant_id bigint,
  job_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create applicant_views table
CREATE TABLE applicant_views (
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
CREATE POLICY "Users can view their own tokens"
  ON user_tokens FOR SELECT
  USING (email = current_setting('app.current_email', true));

CREATE POLICY "Users can update their own tokens"
  ON user_tokens FOR UPDATE
  USING (email = current_setting('app.current_email', true));

CREATE POLICY "Allow token creation"
  ON user_tokens FOR INSERT
  WITH CHECK (true);

-- RLS Policies for token_transactions
CREATE POLICY "Users can view their own transactions"
  ON token_transactions FOR SELECT
  USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow transaction creation"
  ON token_transactions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for applicant_views
CREATE POLICY "Users can view their own applicant views"
  ON applicant_views FOR SELECT
  USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow applicant view creation"
  ON applicant_views FOR INSERT
  WITH CHECK (true);

-- Function to get user's token balance
CREATE OR REPLACE FUNCTION get_user_tokens(user_email_param text)
RETURNS TABLE(
  tokens_available integer,
  tokens_used integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set RLS context
  PERFORM set_config('app.current_email', user_email_param, true);
  
  -- Return user's token balance, create record if doesn't exist
  INSERT INTO user_tokens (email, tokens_available, tokens_used)
  VALUES (user_email_param, 0, 0)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN QUERY
  SELECT ut.tokens_available, ut.tokens_used
  FROM user_tokens ut
  WHERE ut.email = user_email_param;
END;
$$;

-- Function to add tokens to user (after purchase)
CREATE OR REPLACE FUNCTION add_tokens_to_user(
  user_email_param text,
  tokens_to_add integer,
  stripe_session_id_param text DEFAULT NULL,
  description_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean := false;
BEGIN
  -- Set RLS context
  PERFORM set_config('app.current_email', user_email_param, true);
  
  -- Create user record if doesn't exist
  INSERT INTO user_tokens (email, tokens_available, tokens_used)
  VALUES (user_email_param, 0, 0)
  ON CONFLICT (email) DO NOTHING;
  
  -- Add tokens to user's balance
  UPDATE user_tokens 
  SET 
    tokens_available = tokens_available + tokens_to_add,
    updated_at = now()
  WHERE email = user_email_param;
  
  -- Log the transaction
  INSERT INTO token_transactions (
    user_email,
    transaction_type,
    tokens_amount,
    stripe_session_id,
    description
  ) VALUES (
    user_email_param,
    'purchase',
    tokens_to_add,
    stripe_session_id_param,
    COALESCE(description_param, 'Token purchase - ' || tokens_to_add || ' tokens')
  );
  
  success := true;
  RETURN success;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in add_tokens_to_user: %', SQLERRM;
  RETURN false;
END;
$$;

-- Function to use token for viewing applicant
CREATE OR REPLACE FUNCTION use_token_for_applicant(
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
  already_viewed boolean := false;
  success boolean := false;
BEGIN
  -- Set RLS context
  PERFORM set_config('app.current_email', user_email_param, true);
  
  -- Check if user has already viewed this applicant
  SELECT EXISTS(
    SELECT 1 FROM applicant_views 
    WHERE user_email = user_email_param 
    AND applicant_id = applicant_id_param
  ) INTO already_viewed;
  
  -- If already viewed, return true (no token needed)
  IF already_viewed THEN
    RETURN true;
  END IF;
  
  -- Get current token balance
  SELECT tokens_available INTO current_tokens
  FROM user_tokens
  WHERE email = user_email_param;
  
  -- If no tokens available, return false
  IF current_tokens IS NULL OR current_tokens < 1 THEN
    RETURN false;
  END IF;
  
  -- Deduct 1 token
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
  
  -- Log the transaction
  INSERT INTO token_transactions (
    user_email,
    transaction_type,
    tokens_amount,
    applicant_id,
    job_id,
    description
  ) VALUES (
    user_email_param,
    'usage',
    -1,
    applicant_id_param,
    job_id_param,
    'Viewed applicant #' || applicant_id_param
  );
  
  success := true;
  RETURN success;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in use_token_for_applicant: %', SQLERRM;
  RETURN false;
END;
$$;

-- Function to get applicants with view status
CREATE OR REPLACE FUNCTION get_applicants_with_view_status(
  p_job_id text,
  p_user_email text
)
RETURNS TABLE(
  id bigint,
  job_id text,
  name text,
  age integer,
  location text,
  education text,
  cv_url text,
  motivation_text text,
  followup_questions text[],
  followup_answers text[],
  ai_score integer,
  ai_summary text,
  created_at timestamptz,
  email text,
  phone text,
  linkedin_url text,
  working_hours integer,
  work_type text,
  openai_prompt_tokens integer,
  openai_completion_tokens integer,
  openai_total_tokens integer,
  has_viewed boolean,
  can_view boolean,
  requires_token boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tokens_available integer;
BEGIN
  -- Set RLS context
  PERFORM set_config('app.current_email', p_user_email, true);
  
  -- Get user's available tokens
  SELECT tokens_available INTO user_tokens_available
  FROM user_tokens
  WHERE email = p_user_email;
  
  -- Default to 0 if no record found
  user_tokens_available := COALESCE(user_tokens_available, 0);
  
  RETURN QUERY
  SELECT 
    a.*,
    COALESCE(av.user_email IS NOT NULL, false) as has_viewed,
    CASE 
      WHEN av.user_email IS NOT NULL THEN true  -- Already viewed
      WHEN user_tokens_available > 0 THEN true  -- Has tokens
      ELSE false  -- No tokens
    END as can_view,
    CASE 
      WHEN av.user_email IS NOT NULL THEN false  -- Already viewed, no token needed
      WHEN user_tokens_available > 0 THEN true   -- Needs token but has tokens
      ELSE true  -- Needs token but no tokens available
    END as requires_token
  FROM applicants a
  LEFT JOIN applicant_views av ON (a.id = av.applicant_id AND av.user_email = p_user_email)
  WHERE a.job_id = p_job_id
  ORDER BY a.created_at DESC;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_user_tokens_email ON user_tokens(email);
CREATE INDEX idx_token_transactions_user_email ON token_transactions(user_email);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at);
CREATE INDEX idx_applicant_views_user_email ON applicant_views(user_email);
CREATE INDEX idx_applicant_views_applicant_id ON applicant_views(applicant_id);
CREATE INDEX idx_applicant_views_unique ON applicant_views(user_email, applicant_id);