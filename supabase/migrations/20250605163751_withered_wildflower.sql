/*
  # Add master account functionality
  
  1. Changes
    - Add master account validation function
    - Update validate_login to include admin status
    - Drop and recreate validate_login with new return type
    
  2. Security
    - Master account can manage all jobs
    - Existing policies are preserved
*/

-- Create master account function
CREATE OR REPLACE FUNCTION is_master_account(email_address TEXT, passcode_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN LOWER(TRIM(email_address)) = 'frank@sunnychats.com' 
    AND passcode_input = 'xSkdGfTyGsyG6WD';
END;
$$;

-- Drop existing validate_login function
DROP FUNCTION IF EXISTS validate_login(text, text);

-- Recreate validate_login with updated return type
CREATE OR REPLACE FUNCTION validate_login(email_address TEXT, passcode_input TEXT)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  description TEXT,
  requirements TEXT,
  custom_questions TEXT[],
  tags TEXT[],
  deadline TIMESTAMPTZ,
  email TEXT,
  passcode TEXT,
  job_id TEXT,
  company_name TEXT,
  logo_url TEXT,
  notify_threshold INTEGER,
  created_at TIMESTAMPTZ,
  optional_fields JSONB,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if master account
  IF is_master_account(email_address, passcode_input) THEN
    RETURN QUERY
    SELECT 
      j.*,
      TRUE as is_admin
    FROM jobs j;
  ELSE
    -- Regular account login
    RETURN QUERY
    SELECT 
      j.*,
      FALSE as is_admin
    FROM jobs j
    WHERE LOWER(j.email) = LOWER(TRIM(email_address))
      AND j.passcode = passcode_input;
  END IF;
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow master account to delete jobs" ON jobs;
DROP POLICY IF EXISTS "Allow master account to update jobs" ON jobs;

-- Add RLS policies for master account
CREATE POLICY "Allow master account to delete jobs"
ON jobs
FOR DELETE
USING (
  is_master_account(current_setting('app.current_email', TRUE), current_setting('app.current_passcode', TRUE))
);

CREATE POLICY "Allow master account to update jobs"
ON jobs
FOR UPDATE
USING (
  is_master_account(current_setting('app.current_email', TRUE), current_setting('app.current_passcode', TRUE))
);