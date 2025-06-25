/**
 * Utility for sending webhooks to Make.com
 */

// In a real application, this URL would be stored in environment variables
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/xzehelxnc2y9i13ji3rfq11lkr5pp5i0';

type JobNotification = {
  job_id: string;
  job_title: string; // Add job title
  job_url: string; // Add job URL
  dashboard_url: string;
  passcode: string;
  company_name: string;
  contact_email: string;
};

type ApplicantNotification = {
  job_id: string;
  applicant_name: string;
  ai_score: number;
  ai_summary: string;
  dashboard_url: string;
  employer_email: string;
};

type PasswordRecovery = {
  email: string;
  password: string;
  recovery_token: string;
  recovery_url: string;
  company_name: string;
};

/**
 * Send job creation notification to Make.com
 */
export const sendJobCreationWebhook = async (jobData: JobNotification): Promise<boolean> => {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...jobData,
        event_type: 'job_created',
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to send job creation webhook:', error);
    return false;
  }
};

/**
 * Send applicant notification to Make.com if score meets threshold
 */
export const sendApplicantNotificationWebhook = async (
  notification: ApplicantNotification,
  threshold: number
): Promise<boolean> => {
  // Only send if the score meets or exceeds the threshold
  if (notification.ai_score < threshold) {
    return false;
  }
  
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...notification,
        event_type: 'applicant_scored',
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to send applicant notification webhook:', error);
    return false;
  }
};

/**
 * Generate a secure recovery token
 */
function generateRecoveryToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Send password recovery information to Make.com with unique URL
 */
export const sendPasswordRecoveryWebhook = async (email: string, password: string, companyName: string): Promise<boolean> => {
  try {
    const recoveryToken = generateRecoveryToken();
    const recoveryUrl = `${window.location.origin}/reset-password?token=${recoveryToken}&email=${encodeURIComponent(email)}`;
    
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        recovery_token: recoveryToken,
        recovery_url: recoveryUrl,
        company_name: companyName,
        event_type: 'password_recovery',
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to send password recovery webhook:', error);
    return false;
  }
};

// Legacy function for backward compatibility
export const sendPasscodeRecoveryWebhook = async (recoveryData: { email: string; new_passcode: string; dashboard_url: string; company_name: string; }): Promise<boolean> => {
  return sendPasswordRecoveryWebhook(recoveryData.email, recoveryData.new_passcode, recoveryData.company_name);
};