/*
  # Add INSERT policy for jobs table

  1. Changes
    - Add RLS policy to allow public insertion of jobs
    
  2. Security
    - Allows unauthenticated users to create new jobs
    - Maintains existing policies for SELECT and UPDATE
*/

-- Add policy to allow public insertion of jobs
CREATE POLICY "Allow public insertion of jobs"
ON public.jobs
FOR INSERT
TO public
WITH CHECK (true);