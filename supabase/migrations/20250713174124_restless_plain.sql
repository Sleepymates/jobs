/*
  # Token System for Job Postings

  1. New Tables
    - `user_tokens`
      - `id` (uuid, primary key)
      - `email` (text, references jobs.email)
      - `tokens_available` (integer, default 0)
      - `tokens_used` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `token_transactions`
      - `id` (uuid, primary key)
      - `user_email` (text, references user_tokens.email)
      - `transaction_type` (enum: 'purchase', 'usage', 'admin_credit')
      - `tokens_amount` (integer)
      - `stripe_session_id` (text, nullable)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `applicant_views`
      - `id` (uuid, primary key)
      - `user_email` (text)
      - `applicant_id` (bigint, references applicants.id)
      - `job_id` (text)
      - `viewed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
*/

-- Create enum for transaction types
CREATE TYPE token_transaction_type AS ENUM ('purchase', 'usage', 'admin_credit');

-- User tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  tokens_available integer DEFAULT 0 NOT NULL,
  tokens_used integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  transaction_type token_transaction_type NOT NULL,
  tokens_amount integer NOT NULL,
  stripe_session_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Applicant views tracking
CREATE TABLE IF NOT EXISTS applicant_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  applicant_id bigint NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tokens
CREATE POLICY "Users can view their own tokens"
  ON user_tokens
  FOR SELECT
  TO public
  USING (email = current_setting('app.current_email', true));

CREATE POLICY "Users can update their own tokens"
  ON user_tokens
  FOR UPDATE
  TO public
  USING (email = current_setting('app.current_email', true));

CREATE POLICY "Allow token creation"
  ON user_tokens
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for token_transactions
CREATE POLICY "Users can view their own transactions"
  ON token_transactions
  FOR SELECT
  TO public
  USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow transaction creation"
  ON token_transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for applicant_views
CREATE POLICY "Users can view their own applicant views"
  ON applicant_views
  FOR SELECT
  TO public
  USING (user_email = current_setting('app.current_email', true));

CREATE POLICY "Allow applicant view tracking"
  ON applicant_views
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Function to add tokens to user account
CREATE OR REPLACE FUNCTION add_tokens_to_user(
  user_email_param text,
  tokens_to_add integer,
  transaction_description text DEFAULT 'Token purchase',
  stripe_session_id_param text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insert or update user tokens
  INSERT INTO user_tokens (email, tokens_available)
  VALUES (user_email_param, tokens_to_add)
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
  ) VALUES (
    user_email_param,
    'purchase',
    tokens_to_add,
    stripe_session_id_param,
    transaction_description
  );
END;
$$ LANGUAGE plpgsql;

-- Function to use tokens (when viewing applicant)
CREATE OR REPLACE FUNCTION use_token(
  user_email_param text,
  applicant_id_param bigint,
  job_id_param text
) RETURNS boolean AS $$
DECLARE
  available_tokens integer;
  already_viewed boolean;
BEGIN
  -- Check if already viewed
  SELECT EXISTS(
    SELECT 1 FROM applicant_views 
    WHERE user_email = user_email_param 
    AND applicant_id = applicant_id_param
  ) INTO already_viewed;
  
  -- If already viewed, return true (no token needed)
  IF already_viewed THEN
    RETURN true;
  END IF;
  
  -- Get available tokens
  SELECT tokens_available INTO available_tokens
  FROM user_tokens
  WHERE email = user_email_param;
  
  -- If no tokens available, return false
  IF available_tokens IS NULL OR available_tokens <= 0 THEN
    RETURN false;
  END IF;
  
  -- Use one token
  UPDATE user_tokens
  SET 
    tokens_available = tokens_available - 1,
    tokens_used = tokens_used + 1,
    updated_at = now()
  WHERE email = user_email_param;
  
  -- Record the view
  INSERT INTO applicant_views (user_email, applicant_id, job_id)
  VALUES (user_email_param, applicant_id_param, job_id_param);
  
  -- Record the transaction
  INSERT INTO token_transactions (
    user_email,
    transaction_type,
    tokens_amount,
    description
  ) VALUES (
    user_email_param,
    'usage',
    -1,
    'Viewed applicant for job ' || job_id_param
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get user token info
CREATE OR REPLACE FUNCTION get_user_token_info(user_email_param text)
RETURNS TABLE(
  tokens_available integer,
  tokens_used integer,
  total_purchased integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ut.tokens_available, 0) as tokens_available,
    COALESCE(ut.tokens_used, 0) as tokens_used,
    COALESCE(
      (SELECT SUM(tokens_amount) 
       FROM token_transactions 
       WHERE user_email = user_email_param 
       AND transaction_type = 'purchase'), 
      0
    )::integer as total_purchased
  FROM user_tokens ut
  WHERE ut.email = user_email_param
  UNION ALL
  SELECT 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM user_tokens WHERE email = user_email_param)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;