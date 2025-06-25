/*
  # Add optional fields configuration to jobs table

  1. Changes
    - Add optional_fields column to jobs table to store field configuration
    - Update existing policies to handle the new column

  2. Field Options
    - age: Boolean
    - location: Boolean
    - working_hours: Boolean
    - education: Boolean
    - work_type: Boolean
*/

-- Add optional_fields column to jobs table
ALTER TABLE jobs
ADD COLUMN optional_fields JSONB NOT NULL DEFAULT '{
  "age": false,
  "location": false,
  "working_hours": false,
  "education": false,
  "work_type": false
}'::jsonb;

-- Add new columns to applicants table for optional fields
ALTER TABLE applicants
ADD COLUMN working_hours INTEGER,
ADD COLUMN work_type TEXT;

-- Update existing policies
CREATE POLICY "Allow public updates to optional fields"
ON jobs FOR UPDATE
TO public
USING (true)
WITH CHECK (true);