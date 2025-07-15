import { supabase } from '../supabase/supabaseClient';

export interface TokenInfo {
  tokensAvailable: number;
  tokensUsed: number;
  totalPurchased: number;
}

export interface ApplicantViewStatus {
  canView: boolean;
  hasViewed: boolean;
  requiresToken: boolean;
}

/**
 * Get user's token information
 */
export async function getUserTokenInfo(email: string): Promise<TokenInfo> {
  try {
    console.log('Getting token info for:', email);
    
    const { data, error } = await supabase
      .rpc('get_user_token_info', {
      user_email_param: email
      });

    if (error) {
      console.error('Error fetching token info:', error);
      return { tokensAvailable: 0, tokensUsed: 0, totalPurchased: 0 };
    }

    console.log('Raw token data from RPC:', data);

    if (data && data.length > 0) {
      const tokenData = data[0];
      console.log('Token info retrieved:', tokenData);
      return {
        tokensAvailable: tokenData.tokens_available || 0,
        tokensUsed: tokenData.tokens_used || 0,
        totalPurchased: tokenData.total_purchased || 0
      };
    }

    // No record found, return zeros
    console.log('No token record found for user:', email);
    return { tokensAvailable: 0, tokensUsed: 0, totalPurchased: 0 };
  } catch (error) {
    console.error('Error in getUserTokenInfo:', error);
    return { tokensAvailable: 0, tokensUsed: 0, totalPurchased: 0 };
  }
}

/**
 * Check if user can view an applicant
 */
export async function checkApplicantViewStatus(
  email: string, 
  applicantId: number
): Promise<ApplicantViewStatus> {
  try {
    // Check if already viewed
    const { data: viewData, error: viewError } = await supabase
      .from('applicant_views')
      .select('id')
      .eq('user_email', email)
      .eq('applicant_id', applicantId)
      .single();

    if (!viewError && viewData) {
      return {
        canView: true,
        hasViewed: true,
        requiresToken: false
      };
    }

    // Check available tokens
    const tokenInfo = await getUserTokenInfo(email);
    
    return {
      canView: tokenInfo.tokensAvailable > 0,
      hasViewed: false,
      requiresToken: tokenInfo.tokensAvailable <= 0
    };
  } catch (error) {
    console.error('Error checking applicant view status:', error);
    return {
      canView: false,
      hasViewed: false,
      requiresToken: true
    };
  }
}

/**
 * Use a token to view an applicant
 */
export async function useTokenToViewApplicant(
  email: string,
  applicantId: number,
  jobId: string
): Promise<boolean> {
  try {
    console.log('Using token to view applicant:', { email, applicantId, jobId });
    
    const { data, error } = await supabase.rpc('use_token', {
        user_email_param: email,
        applicant_id_param: applicantId,
        job_id_param: jobId
    });

    if (error) {
      console.error('Error using token RPC:', error);
      return false;
    }

    console.log('Token usage result:', data);
    return data === true || data === 't'; // PostgreSQL might return 't' for true
  } catch (error) {
    console.error('Error in useTokenToViewApplicant:', error);
    return false;
  }
}

/**
 * Add tokens to user account (for successful purchases)
 */
export async function addTokensToUser(
  email: string,
  tokens: number,
  stripeSessionId?: string,
  description?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .rpc('add_tokens_to_user', {
        user_email_param: email,
        tokens_to_add: tokens,
        transaction_description: description || `Purchased ${tokens} tokens`,
        stripe_session_id_param: stripeSessionId
      });

    if (error) {
      console.error('Error adding tokens:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addTokensToUser:', error);
    return false;
  }
}

/**
 * Get applicants with view status for a job
 */
export async function getApplicantsWithViewStatus(
  email: string,
  jobId: string
): Promise<any[]> {
  try {
    // Get all applicants for the job
    const { data: applicants, error: applicantsError } = await supabase
      .from('applicants')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (applicantsError) {
      console.error('Error fetching applicants:', applicantsError);
      throw applicantsError;
    }

    if (!applicants || applicants.length === 0) {
      return [];
    }

    // Get viewed applicants
    const { data: viewedApplicants, error: viewedError } = await supabase
      .from('applicant_views')
      .select('applicant_id')
      .eq('user_email', email)
      .eq('job_id', jobId);

    if (viewedError) {
      console.error('Error fetching viewed applicants:', viewedError);
    }

    const viewedIds = new Set(viewedApplicants?.map(v => v.applicant_id) || []);

    // Get user token info
    const tokenInfo = await getUserTokenInfo(email);
    console.log('Token info for applicant view status:', tokenInfo);

    // Mark applicants with view status
    return applicants.map(applicant => ({
      ...applicant,
      hasViewed: viewedIds.has(applicant.id),
      canView: viewedIds.has(applicant.id) || tokenInfo.tokensAvailable > 0,
      requiresToken: !viewedIds.has(applicant.id) && tokenInfo.tokensAvailable <= 0
    }));
  } catch (error) {
    console.error('Error in getApplicantsWithViewStatus:', error);
    return [];
  }
}

/**
 * Calculate how many tokens are needed to view remaining applicants
 */
export function calculateRequiredTokens(applicants: any[]): number {
  return applicants.filter(applicant => 
    !applicant.hasViewed && applicant.requiresToken
  ).length;
}