/*
  # Remove automatic passcode generation
  
  1. Changes
    - Remove the trigger that automatically generates passcodes
    - Remove the related functions
    - Allow users to set their own passwords directly
    
  2. Notes
    - This allows users to create their own passwords instead of auto-generated passcodes
    - Existing jobs and passcodes remain unchanged
*/

-- Drop the trigger
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert ON jobs;

-- Drop the trigger function
DROP FUNCTION IF EXISTS set_passcode_from_email();

-- Drop the passcode generation function
DROP FUNCTION IF EXISTS get_or_create_passcode(text);

-- The passcode field will now be set directly by the application
-- Users can create their own passwords when posting jobs