import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url' || supabaseAnonKey === 'your_supabase_anon_key') {
  throw new Error('Missing or invalid Supabase environment variables. Please click "Connect to Supabase" to set them up.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format. Please ensure VITE_SUPABASE_URL is a valid URL starting with https://');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);