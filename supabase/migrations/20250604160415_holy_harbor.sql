/*
  # Add master passcode functionality
  
  1. Changes
    - Add master_passcode constant
    - Update validate_login function to check for master passcode
*/

-- Set master passcode as a constant
CREATE OR REPLACE FUNCTION get_master_passcode()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '123456789'::TEXT;
$$;

-- Update login validation to check for master passcode
CREATE OR REPLACE FUNCTION validate_login(email_address TEXT, passcode_input TEXT)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if using master passcode
  IF passcode_input = get_master_passcode() THEN
    -- Return all jobs if using master passcode
    RETURN QUERY
    SELECT *
    FROM jobs
    WHERE LOWER(email) = LOWER(TRIM(email_address));
  ELSE
    -- Normal passcode check
    RETURN QUERY
    SELECT *
    FROM jobs
    WHERE LOWER(email) = LOWER(TRIM(email_address))
      AND passcode = passcode_input;
  END IF;
END;
$$;