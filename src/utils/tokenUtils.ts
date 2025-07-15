import { supabase } from '../supabase/supabaseClient';

export interface TokenInfo {
  tokensAvailable: number;
  tokensUsed: number;
}

/**
 * Get user's current token balance
 */
export async function getUserTokens(email: string): Promise<TokenInfo> {
  try {
    console.log('Getting tokens for user:', email);
    
    // Try RPC function first, fallback to direct query
    let data, error;
    try {
      const result = await supabase
        .rpc('get_user_tokens', {
          user_email_param: email
        });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.warn('RPC function not available, using direct query');
      const result = await supabase
        .from('user_tokens')
        .select('tokens_available, tokens_used')
        .eq('email', email)
        .single();
      
      if (result.data) {
        data = [{
          tokens_available: result.data.tokens_available || 0,
          tokens_used: result.data.tokens_used || 0
        }];
      } else {
        data = null;
      }
      error = result.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found, return zero tokens
        return { tokensAvailable: 0, tokensUsed: 0 };
      }
      console.warn('Error fetching user tokens:', error);
      return { tokensAvailable: 0, tokensUsed: 0 };
    }

    if (data && data.length > 0) {
      const result = data[0];
      console.log('User tokens:', result);
      return {
        tokensAvailable: result.tokens_available || 0,
        tokensUsed: result.tokens_used || 0
      };
    }

    return { tokensAvailable: 0, tokensUsed: 0 };
  } catch (error) {
    console.error('Error in getUserTokens:', error);
    return { tokensAvailable: 0, tokensUsed: 0 };
  }
}

/**
 * Use a token to view an applicant (deducts 1 token)
 */
export async function useTokenForApplicant(
  userEmail: string,
  applicantId: number,
  jobId: string
): Promise<boolean> {
  try {
    console.log('Using token for applicant:', { userEmail, applicantId, jobId });
    
    // Try RPC function first, fallback to manual process
    let data, error;
    try {
      const result = await supabase
        .rpc('use_token_for_applicant', {
          user_email_param: userEmail,
          applicant_id_param: applicantId,
          job_id_param: jobId
        });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.warn('RPC function not available, using manual token deduction');
      
      // Manual fallback process
      // 1. Check if already viewed
      const { data: existingView } = await supabase
        .from('applicant_views')
        .select('id')
        .eq('user_email', userEmail)
        .eq('applicant_id', applicantId)
        .single();
      
      if (existingView) {
        return true; // Already viewed, no token needed
      }
      
      // 2. Check token balance
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('tokens_available')
        .eq('email', userEmail)
        .single();
      
      if (!tokenData || tokenData.tokens_available < 1) {
        return false; // Insufficient tokens
      }
      
      // 3. Deduct token and record view
      const { error: updateError } = await supabase
        .from('user_tokens')
        .update({ 
          tokens_available: tokenData.tokens_available - 1,
          tokens_used: (tokenData.tokens_used || 0) + 1
        })
        .eq('email', userEmail);
      
      if (updateError) {
        throw updateError;
      }
      
      // 4. Record the view
      await supabase
        .from('applicant_views')
        .insert({
          user_email: userEmail,
          applicant_id: applicantId,
          job_id: jobId
        });
      
      return true;
    }

    if (error) {
      console.error('Error using token:', error);
      return false;
    }

    console.log('Token usage result:', data);
    return data === true;
  } catch (error) {
    console.error('Error in useTokenForApplicant:', error);
    return false;
  }
}

/**
 * Add tokens to user account (called by webhook after purchase)
 */
export async function addTokensToUser(
  userEmail: string,
  tokensToAdd: number,
  stripeSessionId?: string,
  description?: string
): Promise<boolean> {
  try {
    console.log('Adding tokens to user:', { userEmail, tokensToAdd, stripeSessionId });
    
    const { data, error } = await supabase
      .rpc('add_tokens_to_user', {
        user_email_param: userEmail,
        tokens_to_add: tokensToAdd,
        stripe_session_id_param: stripeSessionId,
        description_param: description || `Token purchase - ${tokensToAdd} tokens`
      });

    if (error) {
      console.error('Error adding tokens:', error);
      return false;
    }

    console.log('Tokens added successfully:', data);
    return data === true;
  } catch (error) {
    console.error('Error in addTokensToUser:', error);
    return false;
  }
}

/**
 * Get applicants with their view status for a job
 */
export async function getApplicantsWithViewStatus(
  jobId: string,
  userEmail: string
): Promise<any[]> {
  try {
    console.log('Getting applicants with view status:', { jobId, userEmail });
    
    // Try RPC function first, fallback to manual join
    let data, error;
    try {
      const result = await supabase
        .rpc('get_applicants_with_view_status', {
          p_job_id: jobId,
          p_user_email: userEmail
        });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.warn('RPC function not available, using manual query');
      
      // Fallback: get basic applicants and mark all as not viewed
      const result = await supabase
        .from('applicants')
        .select('*')
        .eq('job_id', jobId);
      
      if (result.data) {
        data = result.data.map(applicant => ({
          ...applicant,
          has_viewed: false,
          can_view: true,
          requires_token: true
        }));
      } else {
        data = [];
      }
      error = result.error;
    }

    if (error) {
      console.error('Error fetching applicants with view status:', error);
      return [];
    }

    console.log('Applicants with view status:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getApplicantsWithViewStatus:', error);
    return [];
  }
}

/**
 * Calculate how many more tokens are needed to view all remaining applicants
 */
export function calculateTokensNeeded(applicants: any[]): number {
  return applicants.filter(applicant => 
    !applicant.has_viewed && applicant.requires_token
  ).length;
}