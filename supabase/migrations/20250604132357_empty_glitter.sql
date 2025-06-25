/*
  # Update jobs table to handle email-based authentication
  
  1. Changes
    - Add trigger to reuse passcode for same email
    - Add function to get or create passcode for email
*/

-- Function to get or create passcode for an email
CREATE OR REPLACE FUNCTION get_or_create_passcode(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  existing_passcode TEXT;
BEGIN
  -- Check if email already has a passcode
  SELECT passcode INTO existing_passcode
  FROM jobs
  WHERE email = email_address
  LIMIT 1;
  
  -- Return existing passcode if found
  IF existing_passcode IS NOT NULL THEN
    RETURN existing_passcode;
  END IF;
  
  -- Generate new random passcode (6 digits)
  RETURN floor(random() * (999999 - 100000 + 1) + 100000)::TEXT;
END;
$$;

-- Trigger to set passcode before insert
CREATE OR REPLACE FUNCTION set_passcode_from_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set passcode based on email
  NEW.passcode := get_or_create_passcode(NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER tr_set_passcode_before_insert
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_passcode_from_email();