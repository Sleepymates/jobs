-- Remove the automatic passcode generation trigger and function
-- Users will now set their own passwords when creating jobs

-- Drop the trigger
DROP TRIGGER IF EXISTS tr_set_passcode_before_insert ON jobs;

-- Drop the trigger function
DROP FUNCTION IF EXISTS set_passcode_from_email();

-- Drop the passcode generation function
DROP FUNCTION IF EXISTS get_or_create_passcode(text);

-- The passcode field will now be set directly by the application
-- Users can create their own passwords when posting jobs