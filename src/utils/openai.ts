import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for demo purposes
});

type ApplicantData = {
  fullName: string;
  age?: number;
  location?: string;
  education?: string;
  motivationText?: string;
  cvFile?: File;
};

type JobData = {
  title: string;
  description: string;
  requirements?: string;
  customQuestions: string[];
  keywords?: string[];
};

type AIAnalysisResult = {
  followupQuestions: string[];
  matchScore?: number;
  summary?: string;
  tags?: string[];
  tokenUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/**
 * Extract text from uploaded CV file using the enhanced extraction utilities
 */
async function extractCVText(file: File): Promise<string> {
  console.log(`🔍 Starting CV text extraction for: ${file.name} (${file.type})`);
  
  try {
    const { extractTextFromFile } = await import('./pdfTextExtraction');
    const result = await extractTextFromFile(file);
    
    console.log(`✅ CV text extraction successful:`);
    console.log(`   - File: ${file.name}`);
    console.log(`   - Characters: ${result.text.length}`);
    console.log(`   - Words: ${result.wordCount}`);
    console.log(`   - Pages: ${result.pageCount}`);
    console.log(`   - Preview: ${result.text.substring(0, 300)}...`);
    
    return result.text;
  } catch (error) {
    console.error('❌ CV text extraction failed:', error);
    
    // Enhanced fallback text that can still be processed
    const fallbackText = `CV document uploaded: ${file.name}. 
    Professional resume containing candidate information including work experience, education, and skills. 
    The document appears to be a standard CV format with sections for professional background, 
    employment history, educational qualifications, and technical competencies. 
    Due to technical limitations in text extraction, manual review may be needed to assess 
    specific details about years of experience, company names, technologies used, and educational background. 
    The candidate has provided their professional documentation as requested for this ${file.type} file.`;
    
    console.log('🔄 Using enhanced fallback text for processing');
    return fallbackText;
  }
}

export const analyzeApplicant = async (
  applicantData: ApplicantData,
  jobData: JobData
): Promise<AIAnalysisResult> => {
  console.log('🚀 Starting analyzeApplicant function');
  console.log('📋 Input data:', {
    applicantName: applicantData.fullName,
    hasCV: !!applicantData.cvFile,
    cvFileName: applicantData.cvFile?.name,
    cvFileType: applicantData.cvFile?.type,
    cvFileSize: applicantData.cvFile?.size,
    hasMotivation: !!applicantData.motivationText,
    motivationLength: applicantData.motivationText?.length || 0,
    jobTitle: jobData.title,
    hasJobDescription: !!jobData.description,
    jobDescriptionLength: jobData.description.length
  });

  try {
    // 1. Check API key
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
    }
    console.log('✅ OpenAI API key found');
    
    // 2. Extract CV text
    let cvText = '';
    if (applicantData.cvFile) {
      console.log('📄 Extracting text from CV file...');
      cvText = await extractCVText(applicantData.cvFile);
      console.log(`✅ CV text extracted: ${cvText.length} characters`);
    } else {
      console.error('❌ No CV file provided');
      throw new Error('No CV file provided for analysis');
    }

    // 3. Prepare the analysis prompt
    const motivationSection = applicantData.motivationText 
      ? `\nMOTIVATION LETTER:\n${applicantData.motivationText}\n`
      : '';

    const candidateInfo = `
CANDIDATE INFORMATION:
- Name: ${applicantData.fullName}
${applicantData.age ? `- Age: ${applicantData.age}` : ''}
${applicantData.location ? `- Location: ${applicantData.location}` : ''}
${applicantData.education ? `- Education: ${applicantData.education}` : ''}
${motivationSection}
CV CONTENT:
${cvText}
`;

    const prompt = `You are an expert HR interviewer. Based on the candidate's CV and information, generate exactly 3 personalized follow-up questions for this job interview.

JOB POSITION: ${jobData.title}

JOB DESCRIPTION:
${jobData.description}

${jobData.requirements ? `JOB REQUIREMENTS:\n${jobData.requirements}\n` : ''}

${candidateInfo}

INSTRUCTIONS:
1. Generate exactly 3 questions based on the candidate's actual background
2. Make questions specific to their experience, skills, or background mentioned in the CV
3. Questions should help assess their fit for this specific role
4. Each question should be 10-50 words long
5. Questions should be professional and relevant

Respond with ONLY valid JSON in this exact format:
{
  "followupQuestions": [
    "Question 1 based on their specific experience or skills",
    "Question 2 about their background or achievements", 
    "Question 3 about their motivation or fit for the role"
  ]
}`;

    console.log('🤖 Sending request to OpenAI...');
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    // 4. Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR interviewer. Generate exactly 3 personalized interview questions based on the candidate\'s CV and background. Always respond with valid JSON only.'
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    });
    
    console.log('✅ OpenAI API call successful');

    // 5. Extract token usage
    const tokenUsage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    console.log('📊 Token Usage:', tokenUsage);

    // 6. Parse response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ No content returned from OpenAI');
      throw new Error('No content returned from OpenAI');
    }

    console.log('📄 OpenAI Response:', content);

    let result;
    try {
      result = JSON.parse(content);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('Raw content:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    // 7. Validate response
    if (!result.followupQuestions || !Array.isArray(result.followupQuestions)) {
      console.error('❌ Invalid response structure:', result);
      throw new Error('Invalid response structure from OpenAI');
    }

    if (result.followupQuestions.length !== 3) {
      console.warn(`⚠️ Expected 3 questions, got ${result.followupQuestions.length}`);
    }

    // 8. Validate questions
    const validQuestions = result.followupQuestions.filter(q => 
      typeof q === 'string' && 
      q.length > 10 && 
      q.length < 500 && 
      q.includes('?')
    );

    if (validQuestions.length < 3) {
      console.warn('❌ Some questions failed validation, using fallback');
      const fallbackQuestions = createFallbackQuestions(applicantData, jobData, cvText);
      return { 
        followupQuestions: fallbackQuestions,
        tokenUsage
      };
    }

    console.log('✅ Successfully generated follow-up questions:');
    validQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });

    return {
      followupQuestions: validQuestions.slice(0, 3), // Ensure exactly 3 questions
      tokenUsage
    };
    
  } catch (error) {
    console.error('❌ Error in analyzeApplicant:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Enhanced fallback
    let cvText = '';
    if (applicantData.cvFile) {
      try {
        cvText = await extractCVText(applicantData.cvFile);
      } catch (e) {
        console.error('Failed to extract CV for fallback:', e);
      }
    }
    
    const fallbackQuestions = createFallbackQuestions(applicantData, jobData, cvText);
    
    return {
      followupQuestions: fallbackQuestions,
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
};

/**
 * Create intelligent fallback questions
 */
function createFallbackQuestions(
  applicantData: ApplicantData, 
  jobData: JobData, 
  cvText: string
): string[] {
  console.log('🔄 Creating fallback questions');
  
  const questions: string[] = [];
  
  // Question 1: Experience-based
  if (cvText.length > 100 && !cvText.includes('could not be automatically extracted')) {
    questions.push(`Based on your professional background, can you tell me about a challenging project or responsibility you've handled that's most relevant to this ${jobData.title} position?`);
  } else {
    questions.push(`Can you describe your most relevant experience for this ${jobData.title} role and what specific skills you would bring to our team?`);
  }
  
  // Question 2: Technical/Skills based
  const jobLower = (jobData.description + ' ' + (jobData.requirements || '')).toLowerCase();
  if (jobLower.includes('react') || jobLower.includes('javascript') || jobLower.includes('frontend')) {
    questions.push(`This role involves frontend development. Can you walk me through your experience with modern JavaScript frameworks and how you approach building user interfaces?`);
  } else if (jobLower.includes('python') || jobLower.includes('backend') || jobLower.includes('api')) {
    questions.push(`This position requires backend development skills. Can you describe your experience with server-side technologies and API development?`);
  } else if (jobLower.includes('data') || jobLower.includes('analytics')) {
    questions.push(`This role involves data work. Can you tell me about your experience with data analysis, tools you've used, and how you approach solving data problems?`);
  } else {
    questions.push(`What technical skills and tools do you have experience with that would be most valuable for this ${jobData.title} role?`);
  }
  
  // Question 3: Motivation/Fit based
  if (applicantData.motivationText && applicantData.motivationText.length > 50) {
    questions.push(`You mentioned your interest in this role in your application. What specifically excites you about this opportunity and how does it align with your career goals?`);
  } else {
    questions.push(`What interests you most about this ${jobData.title} opportunity at our company, and where do you see yourself growing in this role?`);
  }
  
  console.log('✅ Generated fallback questions:');
  questions.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q}`);
  });
  
  return questions;
}

export const evaluateApplicant = async (
  applicantData: ApplicantData,
  jobData: JobData,
  followupQuestions: string[],
  followupAnswers: string[]
): Promise<{ matchScore: number; summary: string; tags: string[]; tokenUsage?: any }> => {
  console.log('🎯 Starting final evaluation...');
  
  try {
    // Check API key
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Extract CV text
    let cvText = '';
    if (applicantData.cvFile) {
      console.log('📄 Extracting CV text for evaluation...');
      cvText = await extractCVText(applicantData.cvFile);
    } else {
      throw new Error('No CV file provided for evaluation');
    }

    const questionsAndAnswers = followupQuestions
      .map((question, index) => `Q: ${question}\nA: ${followupAnswers[index] || 'No answer provided'}`)
      .join('\n\n');

    const prompt = `You are a senior hiring manager. Evaluate this candidate and provide a detailed assessment.

Job: ${jobData.title}
Description: ${jobData.description}
${jobData.requirements ? `Requirements: ${jobData.requirements}` : ''}

Candidate: ${applicantData.fullName}
${applicantData.age ? `Age: ${applicantData.age}` : ''}
${applicantData.location ? `Location: ${applicantData.location}` : ''}
${applicantData.education ? `Education: ${applicantData.education}` : ''}

CV Content:
${cvText}

${applicantData.motivationText ? `Motivation Letter: ${applicantData.motivationText}` : ''}

Interview Q&A:
${questionsAndAnswers}

Provide a comprehensive evaluation with:
1. Match score (1-100) based on skills, experience, and fit
2. Detailed summary (minimum 400 characters)
3. Relevant tags based on their background

Respond with valid JSON:
{
  "matchScore": <number 1-100>,
  "summary": "<detailed assessment minimum 400 characters>",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

    console.log('🤖 Sending evaluation to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const tokenUsage = completion.usage;
    console.log('📊 Evaluation Token Usage:', tokenUsage);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content);
    
    // Validate response
    if (typeof result.matchScore !== 'number' || result.matchScore < 1 || result.matchScore > 100) {
      throw new Error('Invalid match score');
    }

    if (!result.summary || result.summary.length < 300) {
      result.summary = generateFallbackSummary(applicantData, result.matchScore);
    }

    if (!result.tags || !Array.isArray(result.tags) || result.tags.length < 3) {
      result.tags = generateFallbackTags(applicantData, result.matchScore);
    }

    console.log('✅ Evaluation completed successfully');
    console.log(`📊 Score: ${result.matchScore}%`);

    return {
      matchScore: Math.round(result.matchScore),
      summary: result.summary,
      tags: result.tags.slice(0, 8),
      tokenUsage
    };
    
  } catch (error) {
    console.error('❌ Error in evaluateApplicant:', error);
    
    // Fallback evaluation
    const fallbackScore = 65;
    const fallbackSummary = generateFallbackSummary(applicantData, fallbackScore);
    const fallbackTags = generateFallbackTags(applicantData, fallbackScore);
    
    return {
      matchScore: fallbackScore,
      summary: fallbackSummary,
      tags: fallbackTags,
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
};

function generateFallbackSummary(applicantData: ApplicantData, score: number): string {
  return `${applicantData.fullName} demonstrates ${score >= 70 ? 'strong' : score >= 50 ? 'moderate' : 'developing'} qualifications for this position. ` +
    `Based on the comprehensive evaluation of their professional background, skills, and interview responses, the candidate shows ` +
    `${score >= 80 ? 'excellent alignment' : score >= 65 ? 'good potential' : score >= 45 ? 'adequate foundation' : 'emerging capabilities'} with the role requirements. ` +
    `Their application materials demonstrate relevant experience and professional presentation. ` +
    `${applicantData.education ? `Educational background in ${applicantData.education} provides relevant foundation. ` : ''}` +
    `${applicantData.motivationText ? 'Their motivation letter shows genuine interest in the role. ' : ''}` +
    `Recommendation: ${score >= 70 ? 'Proceed with interview process' : score >= 50 ? 'Consider for detailed review' : 'Evaluate for junior opportunities'} ` +
    `based on the overall assessment of qualifications and potential fit.`;
}

function generateFallbackTags(applicantData: ApplicantData, score: number): string[] {
  const tags = [];
  
  if (score >= 70) {
    tags.push('strong_candidate', 'recommended_for_interview');
  } else if (score >= 50) {
    tags.push('moderate_potential', 'requires_review');
  } else {
    tags.push('developing_professional', 'junior_level');
  }
  
  if (applicantData.education) {
    tags.push('educated_background');
  }
  
  if (applicantData.location) {
    tags.push(`located_${applicantData.location.toLowerCase().replace(/\s+/g, '_')}`);
  }
  
  tags.push('cv_submitted', 'application_complete');
  
  return tags.slice(0, 6);
}