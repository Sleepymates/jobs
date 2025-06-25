/*
  # Fix email uniqueness and prevent duplicate accounts
  
  1. Handle existing duplicate emails by renaming them
  2. Add unique constraint on email (case insensitive)
  3. Create functions to check email existence and get passwords
  4. Update triggers to prevent future duplicates
  5. Clean up orphaned data
*/

-- First, let's identify and handle duplicate emails
-- We'll keep the most recent job for each email and update others to have unique emails
DO $$
DECLARE
    duplicate_email RECORD;
    counter INTEGER;
    job_to_update RECORD;
BEGIN
    -- Find emails that appear more than once (fix GROUP BY issue)
    FOR duplicate_email IN 
        SELECT LOWER(email) as lower_email, COUNT(*) as count
        FROM jobs 
        GROUP BY LOWER(email) 
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        
        -- Get all jobs with this email except the most recent one
        FOR job_to_update IN
            SELECT id, email
            FROM jobs 
            WHERE LOWER(email) = duplicate_email.lower_email
            AND id NOT IN (
                SELECT id 
                FROM jobs 
                WHERE LOWER(email) = duplicate_email.lower_email
                ORDER BY created_at DESC 
                LIMIT 1
            )
            ORDER BY created_at ASC
        LOOP
            -- Update each duplicate with a unique suffix
            UPDATE jobs 
            SET email = job_to_update.email || '_duplicate_' || counter
            WHERE id = job_to_update.id;
            
            counter := counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Handled duplicate email: %', duplicate_email.lower_email;
    END LOOP;
END $$;

-- Now add the unique constraint since duplicates are resolved
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'jobs_email_unique' 
        AND table_name = 'jobs'
    ) THEN
        -- Create a unique index on LOWER(email) for case-insensitive uniqueness
        CREATE UNIQUE INDEX jobs_email_unique ON jobs (LOWER(email));
    END IF;
END $$;

-- Function to check if email already exists (case insensitive)
CREATE OR REPLACE FUNCTION email_exists(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM jobs 
    WHERE LOWER(email) = LOWER(TRIM(email_address))
    AND email NOT LIKE '%_duplicate_%'  -- Exclude duplicate entries
  );
END;
$$;

-- Function to get password for existing email
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

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Drop the existing validate_login function first to avoid return type conflicts
DROP FUNCTION IF EXISTS validate_login(text, text);

-- Create the updated validate_login function with proper return type
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
  optional_fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if master account
  IF is_master_account(email_address, passcode_input) THEN
    RETURN QUERY
    SELECT 
      j.id, j.title, j.description, j.requirements, j.custom_questions,
      j.tags, j.deadline, j.email, j.passcode, j.job_id, j.company_name,
      j.logo_url, j.notify_threshold, j.created_at, j.optional_fields
    FROM jobs j
    WHERE j.email NOT LIKE '%_duplicate_%'  -- Exclude duplicate entries
    ORDER BY j.created_at DESC;
  ELSE
    -- Regular account login - return all jobs for this email/password combination
    RETURN QUERY
    SELECT 
      j.id, j.title, j.description, j.requirements, j.custom_questions,
      j.tags, j.deadline, j.email, j.passcode, j.job_id, j.company_name,
      j.logo_url, j.notify_threshold, j.created_at, j.optional_fields
    FROM jobs j
    WHERE LOWER(j.email) = LOWER(TRIM(email_address))
      AND j.passcode = passcode_input
      AND j.email NOT LIKE '%_duplicate_%'  -- Exclude duplicate entries
    ORDER BY j.created_at DESC;
  END IF;
END;
$$;

-- Update the trigger function to prevent duplicate emails on insert
CREATE OR REPLACE FUNCTION prevent_duplicate_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if email already exists (case insensitive)
  IF EXISTS (
    SELECT 1 FROM jobs 
    WHERE LOWER(email) = LOWER(TRIM(NEW.email))
    AND email NOT LIKE '%_duplicate_%'
    AND id != COALESCE(NEW.id, -1)  -- Exclude current record for updates
  ) THEN
    RAISE EXCEPTION 'Email address already exists: %', NEW.email
      USING ERRCODE = 'unique_violation';
  END IF;
  
  -- Validate email format
  IF NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent duplicate emails
DROP TRIGGER IF EXISTS tr_prevent_duplicate_email ON jobs;
CREATE TRIGGER tr_prevent_duplicate_email
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_email();

-- Update the existing passcode trigger to work with the new constraints
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert ON jobs;
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert_updated ON jobs;

CREATE OR REPLACE FUNCTION set_passcode_from_email_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  existing_passcode TEXT;
BEGIN
  -- Only set passcode for new records or when email changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.email != NEW.email) THEN
    -- Check if this email already has a passcode (excluding duplicates)
    SELECT passcode INTO existing_passcode
    FROM jobs
    WHERE LOWER(email) = LOWER(TRIM(NEW.email))
    AND email NOT LIKE '%_duplicate_%'
    AND id != COALESCE(NEW.id, -1)
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If existing passcode found, use it; otherwise generate a new one
    IF existing_passcode IS NOT NULL THEN
      NEW.passcode := existing_passcode;
    ELSE
      NEW.passcode := floor(random() * (999999 - 100000 + 1) + 100000)::TEXT;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_passcode_before_insert_updated
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_passcode_from_email_updated();

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION email_exists(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_password_for_email(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_valid_email(TEXT) TO authenticated, anon;

-- Clean up any orphaned analytics records for duplicate jobs
DELETE FROM analytics 
WHERE job_id IN (
  SELECT job_id FROM jobs WHERE email LIKE '%_duplicate_%'
);

-- Add a comment to document the duplicate handling
DO $$
BEGIN
    -- Only add comment if the index exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'jobs_email_unique'
    ) THEN
        COMMENT ON INDEX jobs_email_unique IS 'Ensures each email address can only have one active account. Duplicate emails are marked with _duplicate_ suffix.';
    END IF;
END $$;