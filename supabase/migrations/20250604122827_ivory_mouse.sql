/*
  # Add RLS policies for analytics table

  1. Security Changes
    - Enable RLS on analytics table (if not already enabled)
    - Add policy for public insertion of analytics records
    - Add policy for public updates to analytics records
    - Add policy for public read access to analytics records

  This migration ensures that:
    - Anyone can create new analytics records (needed for new job postings)
    - Anyone can update existing analytics records (needed for view counts)
    - Anyone can read analytics records (needed for dashboards)
*/

-- Enable RLS on analytics table if not already enabled
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow public insertion of analytics records
CREATE POLICY "Allow public insertion of analytics"
  ON analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public updates to analytics records
CREATE POLICY "Allow public updates to analytics"
  ON analytics
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public read access to analytics records
CREATE POLICY "Allow public read access to analytics"
  ON analytics
  FOR SELECT
  TO public
  USING (true);