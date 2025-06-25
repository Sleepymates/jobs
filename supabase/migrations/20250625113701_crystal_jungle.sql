/*
  # Allow users to post multiple jobs with same email
  
  1. Changes
    - Remove unique constraint on email to allow multiple jobs per user
    - Update validation to allow same email for multiple jobs
    - Keep password consistency for same email
    
  2. Security
    - Maintains authentication system
    - Users can manage all their jobs with same password
*/

-- Drop the unique constraint on email to allow multiple jobs per user
DROP INDEX IF EXISTS jobs_email_unique;

-- Update the prevent_duplicate_email function to allow multiple jobs per email
-- but still validate email format
CREATE OR REPLACE FUNCTION prevent_duplicate_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate email format, allow multiple jobs per email
  IF NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update email_exists function to return false (since we now allow multiple jobs per email)
CREATE OR REPLACE FUNCTION email_exists(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Always return false to allow multiple jobs per email
  RETURN FALSE;
END;
$$;

-- Update get_password_for_email to get the most recent password for an email
CREATE OR REPLACE FUNCTION get_password_for_email(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_password TEXT;
BEGIN
  SELECT passcode INTO existing_password
  FROM jobs
  WHERE LOWER(email) = LOWER(TRIM(email_address))
  AND email NOT LIKE '%_duplicate_%'  -- Exclude duplicate entries
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN existing_password;
END;
$$;

-- Create a function to ensure password consistency for same email
CREATE OR REPLACE FUNCTION ensure_password_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  existing_password TEXT;
BEGIN
  -- Check if this email already has jobs with a password
  SELECT passcode INTO existing_password
  FROM jobs
  WHERE LOWER(email) = LOWER(TRIM(NEW.email))
  AND email NOT LIKE '%_duplicate_%'
  AND id != COALESCE(NEW.id, -1)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If existing password found and new password is different, use existing password
  IF existing_password IS NOT NULL AND NEW.passcode != existing_password THEN
    NEW.passcode := existing_password;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to ensure password consistency
DROP TRIGGER IF EXISTS tr_ensure_password_consistency ON jobs;
CREATE TRIGGER tr_ensure_password_consistency
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_password_consistency();

-- Update the comment to reflect the new behavior
COMMENT ON TABLE jobs IS 'Jobs table - allows multiple jobs per email address with consistent passwords';