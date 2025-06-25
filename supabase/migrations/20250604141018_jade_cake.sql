/*
  # Add increment_view RPC function
  
  1. New Functions
    - `increment_view`: Increments the view count for a job in the analytics table
      - Parameters:
        - job_id_param (text): The ID of the job to increment views for
      - Returns: void
      
  2. Changes
    - Creates a new RPC function to handle view count increments
    - Handles cases where an analytics record doesn't exist yet
    
  3. Notes
    - Uses an UPSERT pattern to ensure analytics record exists
    - Safe to call multiple times for the same job_id
*/

CREATE OR REPLACE FUNCTION public.increment_view(job_id_param text)
RETURNS void AS $$
BEGIN
  -- Insert a new record or update existing one
  INSERT INTO public.analytics (job_id, views, applicant_count)
  VALUES (job_id_param, 1, 0)
  ON CONFLICT (job_id) 
  DO UPDATE SET views = analytics.views + 1;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function for authenticated and anon users
GRANT EXECUTE ON FUNCTION public.increment_view(text) TO authenticated, anon;