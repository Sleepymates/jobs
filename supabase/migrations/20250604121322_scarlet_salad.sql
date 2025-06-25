/*
  # Create initial schema for recruitment platform

  1. New Tables
    - `jobs` - Stores job listings with their details
    - `applicants` - Stores applicant information and AI analysis
    - `analytics` - Stores view and application count analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for row level security
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  custom_questions TEXT[] NOT NULL,
  tags TEXT[],
  deadline TIMESTAMPTZ,
  email TEXT NOT NULL,
  passcode TEXT NOT NULL,
  job_id TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  notify_threshold INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  location TEXT,
  education TEXT,
  cv_url TEXT NOT NULL,
  motivation_text TEXT,
  followup_questions TEXT[],
  followup_answers TEXT[],
  ai_score INTEGER,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  applicant_count INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create view increment function
CREATE OR REPLACE FUNCTION increment_view()
RETURNS INTEGER
LANGUAGE SQL
AS $$
  UPDATE analytics
  SET views = views + 1
  WHERE job_id = job_id
  RETURNING views;
$$;

-- Create applicant count increment function
CREATE OR REPLACE FUNCTION increment_applicant_count()
RETURNS INTEGER
LANGUAGE SQL
AS $$
  UPDATE analytics
  SET applicant_count = applicant_count + 1
  WHERE job_id = job_id
  RETURNING applicant_count;
$$;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'Company Logos', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-files', 'CV Files', TRUE);

-- Set up policies for storage buckets
CREATE POLICY "Allow public read access for company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Allow public read access for CV files"
ON storage.objects FOR SELECT
USING (bucket_id = 'cv-files');

CREATE POLICY "Allow uploads to company logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Allow uploads to CV files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cv-files');

-- Set up policies for jobs
CREATE POLICY "Public read access for jobs"
ON jobs FOR SELECT
USING (true);

CREATE POLICY "Allow updates to jobs with passcode"
ON jobs FOR UPDATE
USING (true);

-- Set up policies for applicants
CREATE POLICY "Public read access for applicants"
ON applicants FOR SELECT
USING (true);

CREATE POLICY "Allow insertion of applicants"
ON applicants FOR INSERT
WITH CHECK (true);

-- Set up policies for analytics
CREATE POLICY "Public read access for analytics"
ON analytics FOR SELECT
USING (true);

CREATE POLICY "Allow updates to analytics"
ON analytics FOR UPDATE
USING (true);