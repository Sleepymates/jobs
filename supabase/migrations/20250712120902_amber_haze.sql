/*
  # Add OpenAI Token Tracking to Applicants Table

  1. New Columns
    - `openai_prompt_tokens` (integer) - Number of tokens used in the prompt
    - `openai_completion_tokens` (integer) - Number of tokens used in the completion
    - `openai_total_tokens` (integer) - Total tokens used (prompt + completion)

  2. Purpose
    - Track OpenAI API usage for cost monitoring
    - Analyze token consumption patterns
    - Optimize prompts based on usage data

  3. Default Values
    - All columns default to 0 for existing records
    - Nullable to handle cases where token data isn't available
*/

-- Add token tracking columns to applicants table
ALTER TABLE applicants 
ADD COLUMN openai_prompt_tokens integer DEFAULT 0,
ADD COLUMN openai_completion_tokens integer DEFAULT 0,
ADD COLUMN openai_total_tokens integer DEFAULT 0;

-- Add comment to document the new columns
COMMENT ON COLUMN applicants.openai_prompt_tokens IS 'Number of tokens used in OpenAI prompt for this applicant';
COMMENT ON COLUMN applicants.openai_completion_tokens IS 'Number of tokens used in OpenAI completion response for this applicant';
COMMENT ON COLUMN applicants.openai_total_tokens IS 'Total OpenAI tokens used (prompt + completion) for this applicant';

-- Create index for token analysis queries
CREATE INDEX idx_applicants_token_usage ON applicants(openai_total_tokens) WHERE openai_total_tokens > 0;