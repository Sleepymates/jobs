/*
  # Fix passcode login functionality
  
  1. Changes
    - Update get_or_create_passcode function to handle email case sensitivity
    - Add function to validate email and passcode combination
    - Add RPC endpoint for login validation
*/

-- Update get_or_create_passcode function to handle case sensitivity
CREATE OR REPLACE FUNCTION get_or_create_passcode(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  existing_passcode TEXT;
BEGIN
  -- Check if email already has a passcode (case insensitive)
  SELECT passcode INTO existing_passcode
  FROM jobs
  WHERE LOWER(email) = LOWER(TRIM(email_address))
  LIMIT 1;
  
  -- Return existing passcode if found
  IF existing_passcode IS NOT NULL THEN
    RETURN existing_passcode;
  END IF;
  
  -- Generate new random passcode (6 digits)
  RETURN floor(random() * (999999 - 100000 + 1) + 100000)::TEXT;
END;
$$;

-- Function to validate email and passcode combination
CREATE OR REPLACE FUNCTION validate_login(email_address TEXT, passcode_input TEXT)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM jobs
  WHERE LOWER(email) = LOWER(TRIM(email_address))
    AND passcode = passcode_input;
END;
$$;