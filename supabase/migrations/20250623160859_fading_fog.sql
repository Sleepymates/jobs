/*
  # Update passcode logic for email continuity
  
  1. Changes
    - Update get_or_create_passcode function to always return existing passcode for email
    - Ensure same passcode is used across multiple job posts from same user
    - Maintain backward compatibility with existing data
    
  2. Security
    - Preserves existing security model
    - Ensures users can manage all their jobs with one passcode
*/

-- Update get_or_create_passcode function to ensure passcode continuity
CREATE OR REPLACE FUNCTION get_or_create_passcode(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  existing_passcode TEXT;
BEGIN
  -- Check if email already has a passcode (case insensitive)
  -- Order by created_at to get the oldest (first) passcode for this email
  SELECT passcode INTO existing_passcode
  FROM jobs
  WHERE LOWER(email) = LOWER(TRIM(email_address))
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Return existing passcode if found
  IF existing_passcode IS NOT NULL THEN
    RETURN existing_passcode;
  END IF;
  
  -- Generate new random passcode only if no existing passcode found
  RETURN floor(random() * (999999 - 100000 + 1) + 100000)::TEXT;
END;
$$;

-- Update the trigger function to use the updated passcode logic
CREATE OR REPLACE FUNCTION set_passcode_from_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set passcode based on email (will reuse existing or create new)
  NEW.passcode := get_or_create_passcode(NEW.email);
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert ON jobs;
CREATE TRIGGER tr_set_passcode_before_insert
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_passcode_from_email();