import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { FileUpload } from '../components/ui/FileUpload';
import { BubbleInput } from '../components/ui/BubbleInput';
import { ProgressSteps } from '../components/ui/progress-steps';
import { StepContent } from '../components/ui/step-content';
import MinimalFooter from '../components/layout/MinimalFooter';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Loader2, 
  Building2, 
  MapPin, 
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string | null;
  custom_questions: string[];
  tags: string[] | null;
  deadline: string | null;
  email: string;
  job_id: string;
  company_name: string;
  logo_url: string | null;
  created_at: string;
  optional_fields: {
    age: boolean;
    location: boolean;
    education: boolean;
    work_type: boolean;
    working_hours: boolean;
  };
  header_image_url?: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  location: string;
  education: string;
  linkedin_url: string;
  working_hours: string;
  work_type: string;
  cv_file: File | null;
  motivation_text: string;
  followup_answers: string[];
}

const ApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    age: '',
    location: '',
    education: '',
    linkedin_url: '',
    working_hours: '',
    work_type: '',
    cv_file: null,
    motivation_text: '',
    followup_answers: []
  });

  const steps = [
    { title: 'Personal Info', description: 'Basic information about you' },
    { title: 'Upload CV', description: 'Upload your resume/CV' },
    { title: 'AI Questions', description: 'Answer personalized questions' },
    { title: 'Motivation', description: 'Tell us why you want this job' }
  ];

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (err) {
      console.error('Error fetching job:', err);
      setError('Job not found');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = async () => {
    if (currentStep === 1 && formData.cv_file) {
      // Generate AI questions based on CV
      await generateAIQuestions();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const generateAIQuestions = async () => {
    if (!formData.cv_file || !job) return;

    setIsGeneratingQuestions(true);
    try {
      // Upload CV to Supabase storage
      const fileExt = formData.cv_file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, formData.cv_file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cv-uploads')
        .getPublicUrl(fileName);

      // Call AI analysis function
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('process-cv', {
          body: {
            cv_url: publicUrl,
            job_description: job.description,
            job_requirements: job.requirements || '',
            custom_questions: job.custom_questions || []
          }
        });

      if (analysisError) throw analysisError;

      if (analysisData?.questions) {
        setGeneratedQuestions(analysisData.questions);
        setFormData(prev => ({
          ...prev,
          followup_answers: new Array(analysisData.questions.length).fill('')
        }));
      }

      setCurrentStep(2);
    } catch (err) {
      console.error('Error generating AI questions:', err);
      // Skip to next step even if AI fails
      setCurrentStep(2);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSubmit = async () => {
    if (!job) return;

    setIsSubmitting(true);
    try {
      let cvUrl = '';
      
      // Upload CV if provided
      if (formData.cv_file) {
        const fileExt = formData.cv_file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cv-uploads')
          .upload(fileName, formData.cv_file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('cv-uploads')
          .getPublicUrl(fileName);
        
        cvUrl = publicUrl;
      }

      // Submit application
      const { error: insertError } = await supabase
        .from('applicants')
        .insert({
          job_id: job.job_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location || null,
          education: formData.education || null,
          linkedin_url: formData.linkedin_url || null,
          working_hours: formData.working_hours ? parseInt(formData.working_hours) : null,
          work_type: formData.work_type || null,
          cv_url: cvUrl,
          motivation_text: formData.motivation_text || null,
          followup_questions: generatedQuestions.length > 0 ? generatedQuestions : null,
          followup_answers: formData.followup_answers.length > 0 ? formData.followup_answers : null
        });

      if (insertError) throw insertError;

      // Update analytics
      const { error: analyticsError } = await supabase.rpc('increment_applicant_count', {
        target_job_id: job.job_id
      });

      if (analyticsError) {
        console.error('Error updating analytics:', analyticsError);
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.email && formData.phone;
      case 1:
        return formData.cv_file !== null;
      case 2:
        return generatedQuestions.length === 0 || formData.followup_answers.every(answer => answer.trim() !== '');
      case 3:
        return formData.motivation_text.trim() !== '';
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'The job you are looking for does not exist.'}
          </p>
          <Button onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const headerImageUrl = job.header_image_url || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div 
        className="relative h-64 sm:h-80 bg-cover bg-center"
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${headerImageUrl}')` 
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Apply for {job.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{job.company_name}</span>
              </div>
              {job.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <ProgressSteps 
              steps={steps} 
              currentStep={currentStep} 
              className="mb-8"
            />
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {currentStep < 2 && (
              <>
                <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {currentStep + 1}
                        </div>
                        {steps[currentStep].title}
                      </CardTitle>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {steps[currentStep].description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                      <StepContent
                        step={currentStep}
                        formData={formData}
                        job={job}
                        onInputChange={handleInputChange}
                        generatedQuestions={generatedQuestions}
                        isGeneratingQuestions={isGeneratingQuestions}
                      />
                    </CardContent>

                    <CardFooter className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between gap-4">
                      {currentStep > 0 && (
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
                        <Button
                          onClick={handleNext}
                          disabled={!isStepValid() || isGeneratingQuestions}
                          isLoading={isGeneratingQuestions}
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
                      </div>
                    </CardFooter>
                  </motion.div>
                </Card>
              </>
            )}

            {currentStep >= 2 && (
              <>
                <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {currentStep + 1}
                        </div>
                        {steps[currentStep].title}
                      </CardTitle>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {steps[currentStep].description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                      {currentStep === 2 && (
                        <div className="space-y-6">
                          {generatedQuestions.length > 0 ? (
                            <>
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                                    AI-Generated Questions
                                  </h3>
                                </div>
                                <p className="text-blue-800 dark:text-blue-200 text-sm">
                                  Based on your CV and the job requirements, our AI has generated personalized questions for you.
                                </p>
                              </div>
                              
                              <div className="space-y-4">
                                {generatedQuestions.map((question, index) => (
                                  <div key={index} className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Question {index + 1}
                                    </label>
                                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border">
                                      {question}
                                    </p>
                                    <TextArea
                                      value={formData.followup_answers[index] || ''}
                                      onChange={(e) => {
                                        const newAnswers = [...formData.followup_answers];
                                        newAnswers[index] = e.target.value;
                                        handleInputChange('followup_answers', newAnswers);
                                      }}
                                      placeholder="Type your answer here..."
                                      rows={3}
                                      className="w-full"
                                    />
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No AI Questions Generated
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                We couldn't generate personalized questions based on your CV. You can proceed to the next step.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Why do you want to work for {job.company_name}? *
                            </label>
                            <TextArea
                              value={formData.motivation_text}
                              onChange={(e) => handleInputChange('motivation_text', e.target.value)}
                              placeholder="Tell us about your motivation, what excites you about this role, and how you can contribute to the company..."
                              rows={6}
                              className="w-full"
                              required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              This helps us understand your genuine interest in the position.
                            </p>
                          </div>
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