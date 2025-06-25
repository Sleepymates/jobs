/*
  # Remove automatic passcode generation system
  
  1. Changes
    - Remove all triggers and functions that auto-generate passcodes
    - Users will now set their own passwords when creating jobs
    - Existing jobs and passwords remain unchanged
    
  2. Security
    - Maintains existing authentication system
    - Allows users full control over their passwords
*/

-- Drop all automatic passcode generation triggers and functions
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert ON jobs;
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert_updated ON jobs;

-- Drop the passcode generation functions
DROP FUNCTION IF EXISTS set_passcode_from_email();
DROP FUNCTION IF EXISTS set_passcode_from_email_updated();
DROP FUNCTION IF EXISTS get_or_create_passcode(text);

-- The passcode field will now be set directly by the application
-- Users create their own passwords when posting jobs
-- Existing authentication and validation functions remain intact