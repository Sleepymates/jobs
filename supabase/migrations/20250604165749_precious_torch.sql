/*
  # Add Analytics Table Constraints

  1. Changes
    - Add unique constraint on job_id in analytics table
    - Create or replace increment_view function to handle view count updates
    - Create or replace increment_applicant_count function to handle applicant count updates

  2. Security
    - Functions are accessible to public role
*/

-- Add unique constraint to analytics table
ALTER TABLE analytics
ADD CONSTRAINT analytics_job_id_key UNIQUE (job_id);

-- Create or replace increment_view function
CREATE OR REPLACE FUNCTION increment_view(job_id_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO analytics (job_id, views, applicant_count)
  VALUES (job_id_param, 1, 0)
  ON CONFLICT (job_id)
  DO UPDATE SET views = analytics.views + 1;
END;
$$;

-- Create or replace increment_applicant_count function
CREATE OR REPLACE FUNCTION increment_applicant_count(job_id_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE analytics
  SET applicant_count = applicant_count + 1
  WHERE job_id = job_id_param;
END;
$$;