/*
  # Add contact fields to applicants table

  1. Changes
    - Add email field (required)
    - Add phone field (required)
    - Add linkedin_url field (optional)

  2. Data Safety
    - Uses ALTER TABLE ADD COLUMN to safely add new fields
    - No data loss or table recreation
*/

-- Add new columns to applicants table
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Remove the default constraints after adding the columns
ALTER TABLE applicants
ALTER COLUMN email DROP DEFAULT,
ALTER COLUMN phone DROP DEFAULT;