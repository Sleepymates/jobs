/*
  # Fix CV upload storage policies
  
  1. Storage Setup
    - Create cv-uploads bucket if it doesn't exist
    - Set up proper RLS policies for file uploads
    
  2. Security
    - Allow anonymous and authenticated users to upload/read CV files
    - Prevent policy conflicts with IF NOT EXISTS checks
*/

-- Create the cv-uploads storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous uploads to cv-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous reads from cv-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to cv-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from cv-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to cv-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from cv-uploads" ON storage.objects;

-- Allow anonymous users to upload files to cv-uploads bucket
CREATE POLICY "Allow anonymous uploads to cv-uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'cv-uploads');

-- Allow anonymous users to read files from cv-uploads bucket  
CREATE POLICY "Allow anonymous reads from cv-uploads"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'cv-uploads');

-- Allow authenticated users to upload files to cv-uploads bucket
CREATE POLICY "Allow authenticated uploads to cv-uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cv-uploads');

-- Allow authenticated users to read files from cv-uploads bucket
CREATE POLICY "Allow authenticated reads from cv-uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cv-uploads');

-- Allow public updates to storage objects (for metadata updates)
CREATE POLICY "Allow public updates to cv-uploads"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'cv-uploads')
WITH CHECK (bucket_id = 'cv-uploads');

-- Allow public deletes from cv-uploads (for cleanup)
CREATE POLICY "Allow public deletes from cv-uploads"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'cv-uploads');