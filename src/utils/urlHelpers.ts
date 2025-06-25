import { supabase } from '../supabase/supabaseClient';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function generateJobUrl(companyName: string, jobTitle: string, jobId: string): string {
  const companySlug = slugify(companyName);
  const titleSlug = slugify(jobTitle);
  return `/${companySlug}-${titleSlug}-${jobId}`;
}

export async function parseJobUrl(url: string): Promise<string | null> {
  try {
    // Extract the job ID from the end of the URL
    const parts = url.split('-');
    if (parts.length < 1) return null;
    
    const jobId = parts[parts.length - 1];
    if (!jobId) return null;

    // Verify the job exists
    const { data, error } = await supabase
      .from('jobs')
      .select('job_id')
      .eq('job_id', jobId)
      .single();

    if (error || !data) return null;
    
    return jobId;
  } catch (error) {
    console.error('Error parsing job URL:', error);
    return null;
  }
}