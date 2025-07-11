import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, Briefcase, MapPin, Calendar, Tag, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import FileUpload from '../components/ui/FileUpload';
import MinimalFooter from '../components/layout/MinimalFooter';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { supabase } from '../supabase/supabaseClient';
import { analyzeApplicant, evaluateApplicant } from '../utils/openai';
import { sendApplicantNotificationWebhook } from '../utils/makeWebhook';
import { parseJobUrl } from '../utils/urlHelpers';

interface AnalysisResult {
  fileName: string;
  matchScore: number;
  summary: string;
  tags: string[];
  status: 'completed' | 'error';
  error?: string;
  extractedTextLength?: number;
  pageCount?: number;
  wordCount?: number;
  cvFile?: File; // Store the original file for top candidates
}

const ApplyPage: React.FC = () => {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    location: '',
    education: '',
    workType: '',
    workingHours: '',
    linkedinUrl: '',
    cvFile: null as File | null,
    motivationLetter: '',
    customFields: {} as Record<string, string>, // Add custom fields
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Scroll to top when showForm changes
  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [showForm]);

  useEffect(() => {
    const getJobId = async () => {
      if (!jobSlug) {
        setError('Invalid job URL');
        setLoading(false);
        return;
      }

      try {
        const id = await parseJobUrl(jobSlug);
        if (!id) {
          setError('Job not found');
          setLoading(false);
          return;
        }
        setJobId(id);
      } catch (err) {
        console.error('Error parsing job URL:', err);
        setError('Invalid job URL');
        setLoading(false);
      }
    };

    getJobId();
  }, [jobSlug]);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;

      try {
        try {
          await supabase.rpc('increment_view', { job_id_param: jobId });
        } catch (err) {
          console.error('Error incrementing view count:', err);
        }
        
        const { data, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .single();
        
        if (jobError) throw new Error('Job not found');
        
        if (data.deadline && new Date() > new Date(data.deadline)) {
          setError('This job application period has closed.');
          setLoading(false);
          return;
        }
        
        setJob(data);
        
        // Initialize custom fields in form data
        if (data.optional_fields?.custom_fields) {
          const customFieldsObj: Record<string, string> = {};
          data.optional_fields.custom_fields.forEach((field: string) => {
            customFieldsObj[field] = '';
          });
          setFormData(prev => ({
            ...prev,
            customFields: customFieldsObj
          }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Job not found. Please check the URL and try again.');
        setLoading(false);
      }
    };
    
    fetchJob();
  }, [jobId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      cvFile: file,
    }));
    
    // Clear any previous file-related errors
    if (errors.cvFile) {
      setErrors(prev => ({ ...prev, cvFile: '' }));
    }
  };

  const handleFollowupAnswerChange = (index: number, value: string) => {
    const newAnswers = [...followupAnswers];
    newAnswers[index] = value;
    setFollowupAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (!followupAnswers[currentQuestionIndex]?.trim()) {
      setErrors({
        ...errors,
        [`question_${currentQuestionIndex}`]: 'Please answer this question'
      });
      return;
    }
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex(prev => prev - 1);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.fullName) newErrors.fullName = 'Full name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        break;
      
      case 1:
        if (!formData.cvFile) newErrors.cvFile = 'CV is required';
        // Motivation letter is now optional - no validation needed
        break;

      case 2:
        if (!followupAnswers[currentQuestionIndex]?.trim()) {
          newErrors[`question_${currentQuestionIndex}`] = 'Please answer this question';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      setIsGeneratingQuestions(true);
      try {
        console.log('🔍 Starting AI analysis with uploaded CV file...');
        console.log('📄 CV File:', formData.cvFile?.name, formData.cvFile?.size, 'bytes');

        const result = await analyzeApplicant(
          {
            fullName: formData.fullName,
            age: formData.age ? parseInt(formData.age) : undefined,
            location: formData.location,
            education: formData.education,
            motivationText: formData.motivationLetter,
            cvFile: formData.cvFile!, // Pass the actual uploaded file
          },
          {
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            customQuestions: [], // Always empty since we removed custom questions
            keywords: job.tags,
          }
        );

        console.log('✅ AI analysis result:', result);

        // Ensure we have exactly 3 questions
        const questions = result.followupQuestions.slice(0, 3);
        if (questions.length < 3) {
          // Add fallback questions if needed
          const fallbackQuestions = [
            'Could you describe a specific challenge you faced in your previous role and how you overcame it?',
            'What interests you most about this position and why do you think you would be a good fit?',
            'Can you share an example of a project where you had to collaborate with different teams or stakeholders?'
          ];
          
          while (questions.length < 3) {
            questions.push(fallbackQuestions[questions.length]);
          }
        }

        setFollowupQuestions(questions);
        setFollowupAnswers(Array(3).fill(''));
        setCurrentQuestionIndex(0);
      } catch (error) {
        console.error('❌ Error analyzing application:', error);
        setErrors({ submit: 'Failed to process application. Please try again.' });
        return;
      } finally {
        setIsGeneratingQuestions(false);
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || isSubmitting) return;

    setIsSubmitting(true);

    try {
      let cvUrl = '';
      if (formData.cvFile) {
        const fileExt = formData.cvFile.name.split('.').pop();
        const fileName = `${jobId}-${Date.now()}.${fileExt}`;
        
        const { error: fileError } = await supabase.storage
          .from('cv-files')
          .upload(fileName, formData.cvFile);
        
        if (fileError) throw new Error('Failed to upload CV file');
        
        const { data: urlData } = supabase.storage.from('cv-files').getPublicUrl(fileName);
        cvUrl = urlData.publicUrl;
      }

      console.log('🎯 Sending final evaluation to AI with uploaded CV...');
      console.log('📄 CV File for evaluation:', formData.cvFile?.name);

      const evaluation = await evaluateApplicant(
        {
          fullName: formData.fullName,
          age: formData.age ? parseInt(formData.age) : undefined,
          location: formData.location,
          education: formData.education,
          motivationText: formData.motivationLetter,
          cvFile: formData.cvFile!, // Pass the actual uploaded file
        },
        {
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          customQuestions: [], // Always empty since we removed custom questions
          keywords: job.tags,
        },
        followupQuestions,
        followupAnswers
      );

      console.log('✅ Final evaluation result:', evaluation);
      console.log('📊 Match Score:', evaluation.matchScore);
      console.log('📝 Summary:', evaluation.summary);
      console.log('🏷️ Tags:', evaluation.tags);

      const { error: applicantError } = await supabase
        .from('applicants')
        .insert({
          job_id: jobId,
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location || null,
          education: formData.education || null,
          cv_url: cvUrl,
          motivation_text: formData.motivationLetter || null,
          linkedin_url: formData.linkedinUrl || null,
          working_hours: formData.workingHours ? parseInt(formData.workingHours) : null,
          work_type: formData.workType || null,
          followup_questions: followupQuestions,
          followup_answers: followupAnswers,
          ai_score: evaluation.matchScore,
          ai_summary: evaluation.summary,
        });

      if (applicantError) throw applicantError;

      await supabase.rpc('increment_applicant_count', { job_id_param: jobId });

      // Send webhook with applicant email included
      await sendApplicantNotificationWebhook(
        {
          job_id: jobId || '',
          applicant_name: formData.fullName,
          applicant_email: formData.email, // Include applicant email
          ai_score: evaluation.matchScore,
          ai_summary: evaluation.summary,
          dashboard_url: `/dashboard/${jobId}`,
          employer_email: job.email,
        },
        job.notify_threshold
      );

      // Show success modal with confetti effect
      setShowSuccessModal(true);
      
      // Add confetti cannon effect
      createConfettiCannon();
      
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      setErrors({
        submit: 'Failed to submit application. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced confetti cannon effect - upside down funnel from bottom
  const createConfettiCannon = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'];
    const confettiCount = 200; // Even more confetti for cannon effect!
    
    // Create confetti in waves for cannon effect
    for (let wave = 0; wave < 5; wave++) {
      setTimeout(() => {
        for (let i = 0; i < confettiCount / 5; i++) {
          const confetti = document.createElement('div');
          confetti.style.position = 'fixed';
          
          // Cannon effect: start from center bottom and spread outward
          const centerX = window.innerWidth / 2;
          const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.8; // 144 degree spread
          const velocity = Math.random() * 300 + 200; // Random velocity
          
          confetti.style.left = centerX + 'px';
          confetti.style.bottom = '-10px';
          confetti.style.width = Math.random() * 10 + 8 + 'px';
          confetti.style.height = Math.random() * 10 + 8 + 'px';
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.pointerEvents = 'none';
          confetti.style.zIndex = '9999';
          confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
          
          document.body.appendChild(confetti);
          
          // Calculate trajectory for cannon effect
          const horizontalDistance = Math.sin(spreadAngle) * velocity;
          const verticalDistance = Math.cos(spreadAngle) * velocity + Math.random() * 200;
          
          const animation = confetti.animate([
            { 
              transform: 'translateY(0px) translateX(0px) rotate(0deg)', 
              opacity: 1 
            },
            { 
              transform: `translateY(-${verticalDistance}px) translateX(${horizontalDistance}px) rotate(${Math.random() * 720}deg)`, 
              opacity: 0 
            }
          ], {
            duration: Math.random() * 2000 + 3000, // 3-5 seconds for dramatic effect
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          });
          
          animation.onfinish = () => {
            confetti.remove();
          };
        }
      }, wave * 100); // Stagger waves by 100ms
    }
  };

  const renderFollowUpQuestions = () => {
    if (currentStep !== 2) return null;

    const currentQuestion = followupQuestions[currentQuestionIndex];
    const totalQuestions = followupQuestions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}% Complete
          </span>
        </div>

        <div className="relative pt-1 mb-6">
          <div className="flex h-2 overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full">
            <motion.div
              className="bg-gray-900 dark:bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <label className="block text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4 leading-relaxed">
            {currentQuestion}
          </label>
          <TextArea
            value={followupAnswers[currentQuestionIndex] || ''}
            onChange={(e) => handleFollowupAnswerChange(currentQuestionIndex, e.target.value)}
            error={errors[`question_${currentQuestionIndex}`]}
            placeholder="Type your answer here..."
            rows={4}
            fullWidth
          />
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
          {currentQuestionIndex > 0 ? (
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Question
            </Button>
          ) : (
            <div className="hidden sm:block"></div>
          )}
          
          {isLastQuestion ? (
            <Button 
              onClick={() => handleNext()}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Review Application
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleNextQuestion}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Next Question
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        {/* Simplified Header for Loading */}
        <div className="h-16 sm:h-24"></div>
        <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 py-3 sm:py-4">
          <header className="max-w-7xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <div className="px-3 sm:px-4 lg:px-8">
              <div className="flex justify-center h-12 sm:h-14 items-center">
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 mr-2" />
                  <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Loading...
                  </span>
                </div>
              </div>
            </div>
          </header>
        </div>
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="animate-spin h-8 w-8 border-4 border-gray-600 dark:border-gray-500 rounded-full border-t-transparent"></div>
        </main>
        <MinimalFooter />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        {/* Simplified Header for Error */}
        <div className="h-16 sm:h-24"></div>
        <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 py-3 sm:py-4">
          <header className="max-w-7xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <div className="px-3 sm:px-4 lg:px-8">
              <div className="flex justify-center h-12 sm:h-14 items-center">
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 mr-2" />
                  <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Error
                  </span>
                </div>
              </div>
            </div>
          </header>
        </div>
        <main className="flex-grow py-6 sm:py-8">
          <div className="max-w-3xl mx-auto px-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{error}</p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate('/')} className="w-full sm:w-auto">Return to Home</Button>
              </CardFooter>
            </Card>
          </div>
        </main>
        <MinimalFooter />
      </div>
    );
  }

  const steps = [
    'Basic Information',
    'CV & Motivation',
    'Follow-up Questions',
    'Review & Submit',
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      {/* Responsive Branded Header */}
      <div className="h-16 sm:h-24"></div>
      <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 py-3 sm:py-4">
        <header className="max-w-7xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="px-3 sm:px-4 lg:px-8">
            <div className="flex justify-center h-12 sm:h-14 items-center">
              {/* Desktop: Logo → Job Role (Italic) OR Company Name (Bold) → Job Role (Italic) */}
              <div className="hidden md:flex items-center space-x-4">
                {/* Show logo if available, otherwise show briefcase icon */}
                {job?.logo_url ? (
                  <img
                    src={job.logo_url}
                    alt={`${job.company_name} logo`}
                    className="h-8 w-auto"
                  />
                ) : (
                  <>
                    <Briefcase className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    {/* Show company name in bold if no logo */}
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {job?.company_name}
                    </span>
                  </>
                )}
                
                {/* Job Role (Italic) */}
                <span className="text-lg font-medium italic text-gray-700 dark:text-gray-300">
                  {job?.title}
                </span>
              </div>

              {/* Mobile: Logo + Job OR Company Name + Job */}
              <div className="flex md:hidden items-center space-x-3">
                {job?.logo_url ? (
                  <>
                    {/* Logo + Job Title */}
                    <img
                      src={job.logo_url}
                      alt={`${job.company_name} logo`}
                      className="h-6 sm:h-8 w-auto"
                    />
                    <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                      {job?.title}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Briefcase + Company Name */}
                    <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {job?.company_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>
      
      <main className="flex-grow py-6 sm:py-12">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {!showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden">
                  <div className="relative">
                    {/* Header Section - Image or Default Background */}
                    {job.header_image_url ? (
                      <>
                        {/* Custom Header Image */}
                        <div className="w-full h-64 sm:h-80 lg:h-96 relative">
                          <img
                            src={job.header_image_url}
                            alt={`${job.company_name} header`}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/60"></div>
                          
                          <div className="relative px-4 sm:px-8 py-8 sm:py-12 text-white h-full flex flex-col justify-end">
                            {/* Always show HellotoHire logo */}
                            <div className="flex items-center gap-3 mb-4">
                              <img
                                src="https://i.imgur.com/Zq1JAQC.png"
                                alt="HellotoHire logo"
                                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                              />
                              <span className="text-sm sm:text-base font-medium"></span>
                            </div>
                            
                            <AnimatedTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">{job.title}</AnimatedTitle>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-6">
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                                <span className="text-sm sm:text-base">{job.company_name}</span>
                              </div>
                              {job.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                                  <span className="text-sm sm:text-base">{job.location}</span>
                                </div>
                              )}
                              {job.deadline && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                                  <span className="text-sm sm:text-base">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            <Button
                              size="lg"
                              onClick={() => setShowForm(true)}
                              className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                            >
                              Apply Now
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Default Background */}
                        <div className="w-full h-64 sm:h-80 lg:h-96 relative bg-gradient-to-br from-black/90 to-black-900/90"> 
                          <div className="absolute inset-0 bg-[url('https://i.imgur.com/7fxaf8v.jpeg')] bg-cover bg-center mix-blend-overlay opacity-0"></div>
                          
                          <div className="relative px-4 sm:px-8 py-8 sm:py-12 text-white h-full flex flex-col justify-end">
                            {/* Always show HellotoHire logo */}
                            <div className="flex items-center gap-3 mb-4">
                              <img
                                src="https://i.imgur.com/Zq1JAQC.png"
                                alt="HellotoHire logo"
                                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                              />
                            </div>
                            
                            <AnimatedTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">{job.title}</AnimatedTitle>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-6">
                              <div className="flex items-center">
                                <span className="text-sm sm:text-base">{job.company_name}</span>
                              </div>
                              {job.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                                  <span className="text-sm sm:text-base">{job.location}</span>
                                </div>
                              )}
                              {job.deadline && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                                  <span className="text-sm sm:text-base">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            <Button
                              size="lg"
                              onClick={() => setShowForm(true)}
                              className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                            >
                              Apply Now
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 sm:p-8">
                    <div className="prose dark:prose-invert max-w-none">
                      <AnimatedSubtitle className="text-xl sm:text-2xl font-semibold mb-4">About the Role</AnimatedSubtitle>
                      <div className="whitespace-pre-wrap mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed">{job.description}</div>

                      {job.requirements && (
                        <>
                          <AnimatedSubtitle className="text-xl sm:text-2xl font-semibold mb-4">Requirements</AnimatedSubtitle>
                          <div className="whitespace-pre-wrap mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed">{job.requirements}</div>
                        </>
                      )}

                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
                          {job.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <Button
                        size="lg"
                        onClick={() => setShowForm(true)}
                        className="w-full sm:w-auto"
                      >
                        Apply for this Position
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <>
                <div className="mb-6 sm:mb-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between mb-2 gap-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {steps[currentStep]}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <Card>
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-4 sm:p-6">
                      {currentStep === 0 && (
                        <div className="space-y-4 sm:space-y-6">
                          <Input
                            label="Full Name*"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            error={errors.fullName}
                            fullWidth
                            required
                          />
                          
                          <Input
                            label="Email Address*"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            error={errors.email}
                            fullWidth
                            required
                          />
                          
                          <Input
                            label="Phone Number*"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            error={errors.phone}
                            fullWidth
                            required
                          />
                          
                          <Input
                            label="LinkedIn Profile"
                            name="linkedinUrl"
                            type="url"
                            value={formData.linkedinUrl}
                            onChange={handleInputChange}
                            placeholder="https://linkedin.com/in/your-profile"
                            fullWidth
                          />

                          {job.optional_fields?.age && (
                            <Input
                              label="Age"
                              name="age"
                              type="number"
                              value={formData.age}
                              onChange={handleInputChange}
                              fullWidth
                            />
                          )}
                          
                          {job.optional_fields?.location && (
                            <Input
                              label="Location"
                              name="location"
                              value={formData.location}
                              onChange={handleInputChange}
                              placeholder="City, Country"
                              fullWidth
                            />
                          )}
                          
                          {job.optional_fields?.education && (
                            <Input
                              label="Education"
                              name="education"
                              value={formData.education}
                              onChange={handleInputChange}
                              placeholder="Highest level of education"
                              fullWidth
                            />
                          )}
                          
                          {job.optional_fields?.work_type && (
                            <Input
                              label="Preferred Work Type"
                              name="workType"
                              value={formData.workType}
                              onChange={handleInputChange}
                              placeholder="Remote, On-site, or Hybrid"
                              fullWidth
                            />
                          )}
                          
                          {job.optional_fields?.working_hours && (
                            <Input
                              label="Preferred Weekly Hours"
                              name="workingHours"
                              type="number"
                              value={formData.workingHours}
                              onChange={handleInputChange}
                              placeholder="40"
                              fullWidth
                            />
                          )}

                          {/* Custom Fields */}
                          {job.optional_fields?.custom_fields && job.optional_fields.custom_fields.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Additional Information
                              </h3>
                              {job.optional_fields.custom_fields.map((fieldName: string, index: number) => (
                                <Input
                                  key={index}
                                  label={fieldName}
                                  value={formData.customFields[fieldName] || ''}
                                  onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                                  placeholder={`Enter ${fieldName.toLowerCase()}`}
                                  fullWidth
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {currentStep === 1 && (
                        <div className="space-y-6">
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                              🤖 AI-Powered Analysis
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              Our AI will analyze your uploaded CV content to generate exactly 3 personalized follow-up questions based on your actual experience, skills, and background.
                            </p>
                          </div>

                          <FileUpload
                            label="CV/Resume*"
                            accept=".pdf,.docx"
                            maxSize={10 * 1024 * 1024}
                            onChange={handleFileChange}
                            value={formData.cvFile}
                            error={errors.cvFile}
                            helperText="Upload your CV (PDF or DOCX, max 10MB). AI will extract and analyze the actual content from your file."
                          />
                          
                          <TextArea
                            label="Motivation Letter (Optional)"
                            name="motivationLetter"
                            value={formData.motivationLetter}
                            onChange={handleInputChange}
                            error={errors.motivationLetter}
                            placeholder="Why are you interested in this position? What makes you a good fit? (Optional)"
                            rows={6}
                            fullWidth
                          />
                        </div>
                      )}

                      {currentStep === 2 && renderFollowUpQuestions()}

                      {currentStep === 3 && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Review Your Application
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Personal Information
                              </h4>
                              <dl className="grid grid-cols-1 gap-2">
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <dt className="text-gray-600 dark:text-gray-400 text-sm">Name:</dt>
                                  <dd className="text-gray-900 dark:text-white font-medium text-sm">{formData.fullName}</dd>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <dt className="text-gray-600 dark:text-gray-400 text-sm">Email:</dt>
                                  <dd className="text-gray-900 dark:text-white font-medium text-sm break-all">{formData.email}</dd>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <dt className="text-gray-600 dark:text-gray-400 text-sm">Phone:</dt>
                                  <dd className="text-gray-900 dark:text-white font-medium text-sm">{formData.phone}</dd>
                                </div>
                              </dl>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Application Details
                              </h4>
                              <dl className="grid grid-cols-1 gap-2">
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <dt className="text-gray-600 dark:text-gray-400 text-sm">CV:</dt>
                                  <dd className="text-gray-900 dark:text-white font-medium text-sm break-all">
                                    {formData.cvFile?.name}
                                  </dd>
                                </div>
                                {formData.motivationLetter && (
                                  <div>
                                    <dt className="text-gray-600 dark:text-gray-400 mb-2 text-sm">Motivation Letter:</dt>
                                    <dd className="text-gray-900 dark:text-white font-medium whitespace-pre-wrap text-sm">
                                      {formData.motivationLetter}
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                AI-Generated Follow-up Questions (3)
                              </h4>
                              <dl className="space-y-4">
                                {followupQuestions.map((question, index) => (
                                  <div key={index}>
                                    <dt className="text-gray-600 dark:text-gray-400 mb-1 text-sm">{question}</dt>
                                    <dd className="text-gray-900 dark:text-white font-medium pl-4 border-l-2 border-gray-300 dark:border-gray-600 text-sm">
                                      {followupAnswers[index]}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          </div>
                        </div>
                      )}

                      {errors.submit && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                          {errors.submit}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between gap-4">
                      {currentStep > 0 && currentStep !== 2 && (
                        <Button
                          variant="outline"
                          onClick={handleBack}
                          icon={<ArrowLeft className="h-4 w-4" />}
                          className="w-full sm:w-auto order-2 sm:order-1"
                        >
                          Back
                        </Button>
                      )}
                      
                      <div className="w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
                        {currentStep < steps.length - 1 && currentStep !== 2 ? (
                          <Button
                            onClick={handleNext}
                            isLoading={isGeneratingQuestions}
                            disabled={isGeneratingQuestions}
                            className="min-w-[200px] flex items-center justify-center w-full sm:w-auto"
                          >
                            {isGeneratingQuestions ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="hidden sm:inline">Analyzing CV & Generating Questions...</span>
                                <span className="sm:hidden">Analyzing CV...</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">{currentStep === 1 ? 'Analyze CV & Generate 3 Questions' : 'Next Step'}</span>
                                <span className="sm:hidden">{currentStep === 1 ? 'Analyze CV' : 'Next'}</span>
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        ) : currentStep === steps.length - 1 ? (
                          <Button
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                            className="min-w-[180px] flex items-center justify-center w-full sm:w-auto"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="hidden sm:inline">Submitting Application...</span>
                                <span className="sm:hidden">Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                <span>Submit Application</span>
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </CardFooter>
                  </motion.div>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8 text-center"
          >
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Application Submitted Successfully! 🎉
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
              Thank you for applying to {job.title} at {job.company_name}. Your application has been received and analyzed by our AI system.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Return to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSuccessModal(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      <MinimalFooter />
    </div>
  );
};

export default ApplyPage;