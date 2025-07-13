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
    const { data, error } = await supabase
      .rpc('get_user_token_info', { user_email_param: email });

    if (error) {
      console.error('Error fetching token info:', error);
      return { tokensAvailable: 0, tokensUsed: 0, totalPurchased: 0 };
    }

    if (data && data.length > 0) {
      return {
        tokensAvailable: data[0].tokens_available || 0,
        tokensUsed: data[0].tokens_used || 0,
        totalPurchased: data[0].total_purchased || 0
      };
    }

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
    // Set the email in the session for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_email',
      setting_value: email
    });

    const { data, error } = await supabase
      .rpc('use_token', {
        user_email_param: email,
        applicant_id_param: applicantId,
        job_id_param: jobId
      });

    if (error) {
      console.error('Error using token:', error);
      return false;
    }

    return data === true;
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