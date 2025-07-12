/*
  # Add OpenAI Token Tracking to Applicants Table

  1. New Columns
    - `openai_prompt_tokens` (integer) - Number of tokens used in OpenAI prompt for this applicant
    - `openai_completion_tokens` (integer) - Number of tokens used in OpenAI completion response for this applicant  
    - `openai_total_tokens` (integer) - Total OpenAI tokens used (prompt + completion) for this applicant

  2. Indexes
    - Add index on `openai_total_tokens` for efficient querying of token usage

  3. Comments
    - Add descriptive comments for each new column to explain their purpose

  This enables tracking of OpenAI API costs and usage patterns per applicant analysis.
*/

-- Add OpenAI token tracking columns to applicants table
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS openai_prompt_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS openai_completion_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS openai_total_tokens integer DEFAULT 0;

-- Add comments to explain the purpose of each column
COMMENT ON COLUMN applicants.openai_prompt_tokens IS 'Number of tokens used in OpenAI prompt for this applicant';
COMMENT ON COLUMN applicants.openai_completion_tokens IS 'Number of tokens used in OpenAI completion response for this applicant';
COMMENT ON COLUMN applicants.openai_total_tokens IS 'Total OpenAI tokens used (prompt + completion) for this applicant';

-- Add index for efficient querying of token usage
CREATE INDEX IF NOT EXISTS idx_applicants_token_usage 
ON applicants (openai_total_tokens) 
WHERE openai_total_tokens > 0;

-- Add constraints to ensure token counts are non-negative
ALTER TABLE applicants 
ADD CONSTRAINT IF NOT EXISTS chk_openai_prompt_tokens_non_negative 
CHECK (openai_prompt_tokens >= 0);

ALTER TABLE applicants 
ADD CONSTRAINT IF NOT EXISTS chk_openai_completion_tokens_non_negative 
CHECK (openai_completion_tokens >= 0);

ALTER TABLE applicants 
ADD CONSTRAINT IF NOT EXISTS chk_openai_total_tokens_non_negative 
CHECK (openai_total_tokens >= 0);

-- Add constraint to ensure total tokens equals sum of prompt and completion tokens
ALTER TABLE applicants 
ADD CONSTRAINT IF NOT EXISTS chk_openai_total_tokens_sum 
CHECK (openai_total_tokens = openai_prompt_tokens + openai_completion_tokens);