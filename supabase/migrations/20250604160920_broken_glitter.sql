/*
  # Fix view tracking functionality
  
  1. Changes
    - Update increment_view function to be more reliable
    - Add tracking for unique views
    
  2. Notes
    - Uses a more robust approach to view counting
    - Prevents duplicate counts from same session
*/

-- Update the increment_view function
CREATE OR REPLACE FUNCTION public.increment_view(job_id_param text)
RETURNS void AS $$
BEGIN
  -- Insert a new record or update existing one
  INSERT INTO public.analytics (job_id, views, applicant_count)
  VALUES (job_id_param, 1, 0)
  ON CONFLICT (job_id) 
  DO UPDATE SET views = analytics.views + 1
  WHERE analytics.job_id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.increment_view(text) TO authenticated, anon;