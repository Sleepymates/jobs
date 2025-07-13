import { supabase } from '../supabase/supabaseClient';
import { generateJobId } from './generateId';
import { generateJobUrl } from './urlHelpers';
import { sendJobCreationWebhook } from './makeWebhook';

interface JobData {
  title: string;
  description: string;
  requirements?: string;
  customQuestions: string[];
  tags?: string[];
  deadline?: string;
  email: string;
  passcode: string;
  companyName: string;
  logoUrl?: string;
  headerImageUrl?: string;
  notifyThreshold?: number;
}

interface JobPostingResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

export async function postJobToDatabase(jobData: JobData): Promise<JobPostingResult> {
  try {
    console.log('Posting job to database:', jobData);

    const jobId = generateJobId();
    
    // Insert job into database
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        job_id: jobId,
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements || null,
        custom_questions: jobData.customQuestions,
        tags: jobData.tags || null,
        deadline: jobData.deadline || null,
        email: jobData.email.toLowerCase().trim(),
        passcode: jobData.passcode,
        company_name: jobData.companyName,
        logo_url: jobData.logoUrl || null,
        header_image_url: jobData.headerImageUrl || null,
        notify_threshold: jobData.notifyThreshold || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting job:', error);
      throw error;
    }

    console.log('Job inserted successfully:', data);

    // Create analytics entry
    const { error: analyticsError } = await supabase
      .from('analytics')
      .insert({
        job_id: jobId,
        views: 0,
        applicant_count: 0,
      });

    if (analyticsError) {
      console.warn('Error creating analytics entry:', analyticsError);
    }

    // Generate job URL and dashboard URL
    const jobUrl = generateJobUrl(jobData.companyName, jobData.title, jobId);
    const fullJobUrl = `${window.location.origin}${jobUrl}`;
    const dashboardUrl = `${window.location.origin}/dashboard/${jobId}`;

    // Send webhook notification
    try {
      const webhookSuccess = await sendJobCreationWebhook({
        job_id: jobId,
        job_title: jobData.title,
        job_url: fullJobUrl,
        dashboard_url: dashboardUrl,
        passcode: jobData.passcode,
        company_name: jobData.companyName,
        contact_email: jobData.email,
      });

      if (webhookSuccess) {
        console.log('Job creation webhook sent successfully');
      } else {
        console.warn('Failed to send job creation webhook');
      }
    } catch (webhookError) {
      console.error('Error sending webhook:', webhookError);
    }

    return {
      success: true,
      jobId: jobId,
    };

  } catch (error) {
    console.error('Error posting job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}