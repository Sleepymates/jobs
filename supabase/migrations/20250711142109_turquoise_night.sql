/*
  # Add header image support to jobs table

  1. Changes
    - Add `header_image_url` column to `jobs` table to store header/banner images
    
  2. Security
    - No changes to RLS policies needed as this is just an additional optional field
*/

-- Add header_image_url column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS header_image_url text;

-- Add comment to document the new column
COMMENT ON COLUMN jobs.header_image_url IS 'URL of the header/banner image for the job listing';