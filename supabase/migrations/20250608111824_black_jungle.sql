/*
  # CV Analysis System Database Schema

  1. New Tables
    - `cv_uploads` - Stores CV file metadata and analysis results
    - `analysis_jobs` - Tracks batch analysis jobs
    - `job_descriptions` - Stores job descriptions for analysis

  2. Storage
    - Create cv-uploads bucket for file storage
    - Set up RLS policies for secure access

  3. Functions
    - Cleanup function for old files
    - Analysis status tracking
*/

-- Create cv_uploads table
CREATE TABLE IF NOT EXISTS cv_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  extracted_text text,
  analysis_score integer,
  analysis_summary text,
  analysis_tags text[],
  job_description_id uuid,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed')),
  error_message text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create job_descriptions table
CREATE TABLE IF NOT EXISTS job_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  keywords text[],
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create analysis_jobs table for batch processing
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_description_id uuid NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  total_files integer NOT NULL DEFAULT 0,
  processed_files integer NOT NULL DEFAULT 0,
  failed_files integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key relationship
ALTER TABLE cv_uploads 
ADD CONSTRAINT cv_uploads_job_description_fkey 
FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cv_uploads_status ON cv_uploads(status);
CREATE INDEX IF NOT EXISTS idx_cv_uploads_uploaded_at ON cv_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_cv_uploads_job_description_id ON cv_uploads(job_description_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);

-- Enable Row Level Security
ALTER TABLE cv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for CV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'cv-uploads', 
  'CV Uploads', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated uploads to cv-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cv-uploads');

CREATE POLICY "Allow authenticated read access to cv-uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cv-uploads');

CREATE POLICY "Allow authenticated delete from cv-uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cv-uploads');

-- RLS Policies for tables
CREATE POLICY "Allow public read access to cv_uploads"
ON cv_uploads FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert to cv_uploads"
ON cv_uploads FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update to cv_uploads"
ON cv_uploads FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public read access to job_descriptions"
ON job_descriptions FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert to job_descriptions"
ON job_descriptions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access to analysis_jobs"
ON analysis_jobs FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert to analysis_jobs"
ON analysis_jobs FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update to analysis_jobs"
ON analysis_jobs FOR UPDATE
TO public
USING (true);

-- Function to cleanup old files (older than 4 days)
CREATE OR REPLACE FUNCTION cleanup_old_cv_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_file RECORD;
BEGIN
  -- Find files older than 4 days
  FOR old_file IN 
    SELECT id, filename, file_url
    FROM cv_uploads 
    WHERE uploaded_at < NOW() - INTERVAL '4 days'
  LOOP
    -- Delete from storage
    PERFORM storage.delete_object('cv-uploads', old_file.filename);
    
    -- Delete from database
    DELETE FROM cv_uploads WHERE id = old_file.id;
    
    RAISE NOTICE 'Deleted old CV file: %', old_file.filename;
  END LOOP;
END;
$$;

-- Function to update analysis results
CREATE OR REPLACE FUNCTION update_cv_analysis(
  cv_id uuid,
  extracted_text_param text,
  score_param integer,
  summary_param text,
  tags_param text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cv_uploads 
  SET 
    extracted_text = extracted_text_param,
    analysis_score = score_param,
    analysis_summary = summary_param,
    analysis_tags = tags_param,
    status = 'analyzed',
    analyzed_at = now(),
    updated_at = now()
  WHERE id = cv_id;
END;
$$;

-- Function to mark CV analysis as failed
CREATE OR REPLACE FUNCTION mark_cv_analysis_failed(
  cv_id uuid,
  error_msg text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cv_uploads 
  SET 
    status = 'failed',
    error_message = error_msg,
    updated_at = now()
  WHERE id = cv_id;
END;
$$;

-- Function to get analysis statistics
CREATE OR REPLACE FUNCTION get_analysis_stats(job_desc_id uuid)
RETURNS TABLE (
  total_files bigint,
  analyzed_files bigint,
  failed_files bigint,
  processing_files bigint,
  average_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE status = 'analyzed') as analyzed_files,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_files,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_files,
    ROUND(AVG(analysis_score), 2) as average_score
  FROM cv_uploads 
  WHERE job_description_id = job_desc_id;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_cv_uploads_updated_at 
  BEFORE UPDATE ON cv_uploads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_descriptions_updated_at 
  BEFORE UPDATE ON job_descriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_jobs_updated_at 
  BEFORE UPDATE ON analysis_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();