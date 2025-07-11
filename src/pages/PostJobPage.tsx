import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Send, ArrowRight, CheckCircle, Users, Brain, Target, Zap, Copy, ExternalLink, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import FileUpload from '../components/ui/FileUpload';
import BubbleInput from '../components/ui/BubbleInput';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { generateJobId } from '../utils/generateId';
import { generateJobUrl } from '../utils/urlHelpers';
import { supabase } from '../supabase/supabaseClient';
import { sendJobCreationWebhook } from '../utils/makeWebhook';
import { ProgressSteps } from '../components/ui/progress-steps';
import { StepContent } from '../components/ui/step-content';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, email: userEmail, passcode: userPassword } = useAuthStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [existingPassword, setExistingPassword] = useState('');
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    headerImage: null as File | null,
    requirements: [] as string[],
    keywords: [] as string[],
    applicationDeadline: '',
    email: '',
    password: '',
    notificationPreference: '0',
    companyName: '',
    companyLogo: null as File | null,
    optionalFields: {
      age: false,
      location: false,
      working_hours: false,
      education: false,
      work_type: false,
    },
    customFields: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCustomField, setNewCustomField] = useState('');

  // Scroll to top on component mount and when showForm changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-fill email and password if user is logged in
  useEffect(() => {
    if (isLoggedIn && userEmail && userPassword) {
      setFormData(prev => ({
        ...prev,
        email: userEmail,
        password: userPassword
      }));
      setEmailExists(true);
      setExistingPassword(userPassword);
    }
  }, [isLoggedIn, userEmail, userPassword]);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [showForm]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [success]);

  const steps = [
    "Job Details",
    "Company Information",
    "Application Settings"
  ];

  // Check if email already exists when user types
  const checkEmailExists = async (email: string) => {
    if (!email.trim() || isLoggedIn) return;

    try {
      const { data, error } = await supabase.rpc('email_exists', {
        email_address: email.trim()
      });

      if (!error && data) {
        setEmailExists(true);
        // Get the existing password
        const { data: passwordData } = await supabase.rpc('get_password_for_email', {
          email_address: email.trim()
        });
        if (passwordData) {
          setExistingPassword(passwordData);
          setFormData(prev => ({ ...prev, password: passwordData }));
        }
      } else {
        setEmailExists(false);
        setExistingPassword('');
        if (formData.password === existingPassword) {
          setFormData(prev => ({ ...prev, password: '' }));
        }
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }

    // Check email exists when email changes
    if (name === 'email') {
      checkEmailExists(value);
    }
  };

  const handleOptionalFieldChange = (field: string) => {
    setFormData({
      ...formData,
      optionalFields: {
        ...formData.optionalFields,
        [field]: !formData.optionalFields[field as keyof typeof formData.optionalFields],
      },
    });
  };

  const handleLogoChange = (file: File | null) => {
    setFormData({
      ...formData,
      companyLogo: file,
    });
    
    if (errors.companyLogo) {
      setErrors({
        ...errors,
        companyLogo: '',
      });
    }
  };

  const handleHeaderImageChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, headerImage: file }));
  };

  const addCustomField = () => {
    if (newCustomField.trim() && formData.customFields.length < 3) {
      setFormData({
        ...formData,
        customFields: [...formData.customFields, newCustomField.trim()],
      });
      setNewCustomField('');
    }
  };

  const removeCustomField = (index: number) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter((_, i) => i !== index),
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }
    
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = 'Job description is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!emailExists && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createConfettiCannon = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'];
    const confettiCount = 300;
    
    for (let wave = 0; wave < 6; wave++) {
      setTimeout(() => {
        for (let i = 0; i < confettiCount / 6; i++) {
          const confetti = document.createElement('div');
          confetti.style.position = 'fixed';
          
          const centerX = window.innerWidth / 2;
          const spreadAngle = (Math.random() - 0.5) * Math.PI * 1.2;
          const velocity = Math.random() * 400 + 300;
          
          confetti.style.left = centerX + 'px';
          confetti.style.bottom = '-20px';
          confetti.style.width = Math.random() * 12 + 6 + 'px';
          confetti.style.height = Math.random() * 12 + 6 + 'px';
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.pointerEvents = 'none';
          confetti.style.zIndex = '9999';
          confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
          confetti.style.opacity = (Math.random() * 0.6 + 0.4).toString();
          
          document.body.appendChild(confetti);
          
          const horizontalDistance = Math.sin(spreadAngle) * velocity;
          const verticalDistance = Math.cos(spreadAngle) * velocity + Math.random() * 300;
          
          const animation = confetti.animate([
            { 
              transform: 'translateY(0px) translateX(0px) rotate(0deg)', 
              opacity: confetti.style.opacity 
            },
            { 
              transform: `translateY(-${verticalDistance}px) translateX(${horizontalDistance}px) rotate(${Math.random() * 1080}deg)`, 
              opacity: 0 
            }
          ], {
            duration: Math.random() * 3000 + 4000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          });
          
          animation.onfinish = () => {
            confetti.remove();
          };
        }
      }, wave * 150);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const job_id = generateJobId();
      
      let logoUrl = null;
      if (formData.companyLogo) {
        const fileExt = formData.companyLogo.name.split('.').pop();
        const fileName = `${job_id}-logo.${fileExt}`;
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, formData.companyLogo);
        
        if (fileError) {
          throw new Error('Failed to upload company logo');
        }
        
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
        logoUrl = urlData.publicUrl;
      }

      let headerImageUrl = null;
      if (formData.headerImage) {
        const fileExt = formData.headerImage.name.split('.').pop();
        const fileName = `${job_id}-header.${fileExt}`;
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, formData.headerImage);
        
        if (fileError) {
          throw new Error('Failed to upload header image');
        }
        
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
        headerImageUrl = urlData.publicUrl;
      }

      const allOptionalFields = {
        ...formData.optionalFields,
        custom_fields: formData.customFields,
      };
      
      const { data, error } = await supabase.from('jobs').insert({
        title: formData.jobTitle,
        description: formData.jobDescription,
        requirements: formData.requirements.length > 0 ? formData.requirements.join('\n') : null,
        custom_questions: [],
        tags: formData.keywords.length > 0 ? formData.keywords : null,
        deadline: formData.applicationDeadline || null,
        email: formData.email,
        passcode: formData.password,
        job_id,
        company_name: formData.companyName,
        logo_url: logoUrl,
        header_image_url: headerImageUrl || null,
        notify_threshold: parseInt(formData.notificationPreference, 10),
        optional_fields: allOptionalFields,
      }).select();
      
      if (error) {
        if (error.code === '23505' && error.message.includes('jobs_email_unique')) {
          throw new Error('An account with this email already exists. Please use the existing password or recover your password.');
        }
        throw new Error(error.message);
      }

      if (data) {
        const job = data[0];
        const applicationUrl = generateJobUrl(job.company_name, job.title, job.job_id);
        const dashboardUrl = `/dashboard/${job.job_id}`;
        const fullApplicationUrl = window.location.origin + applicationUrl;
        const fullDashboardUrl = window.location.origin + dashboardUrl;
        
        await supabase.from('analytics').insert({
          job_id,
          views: 0,
          applicant_count: 0,
        });
        
        await sendJobCreationWebhook({
          job_id: job.job_id,
          job_title: job.title,
          job_url: fullApplicationUrl,
          dashboard_url: fullDashboardUrl,
          passcode: formData.password,
          company_name: formData.companyName,
          contact_email: formData.email,
        });
        
        setSuccess(true);
        setJobData({
          applicationUrl: fullApplicationUrl,
          dashboardUrl: fullDashboardUrl,
          passcode: formData.password,
          jobTitle: job.title,
          companyName: job.company_name,
        });

        setTimeout(() => {
          createConfettiCannon();
        }, 500);
      }
      
    } catch (error) {
      console.error('Error creating job:', error);
      setErrors({
        ...errors,
        submit: error instanceof Error ? error.message : 'Failed to create job. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        <Header />
        
        <main className="flex-grow">
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none">
              <FloatingPaths position={1} />
              <FloatingPaths position={-1} />

              <div>
                <FileUpload
                  label="Header Image (Optional)"
                  accept=".jpg,.jpeg,.png"
                  maxSize={5 * 1024 * 1024} // 5MB
                  onChange={handleHeaderImageChange}
                  value={formData.headerImage}
                  error={errors.headerImage}
                  helperText="Upload a banner/header image for your job listing. Maximum file size: 5MB. Accepted formats: JPG, PNG"
                />
              </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      🚀 AI-Powered Recruitment
                    </span>
                  </div>
                  
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                      Post Your Job & Find Perfect Candidates
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                      Create a job listing with AI-powered application screening. Our system automatically generates 
                      personalized follow-up questions based on each candidate's actual CV content.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">AI analyzes each CV and generates personalized questions</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">Smart scoring system ranks candidates automatically</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">Real-time dashboard to manage applications</span>
                    </div>
                    <div className="hidden sm:flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">Email notifications for high-scoring candidates</span>
                    </div>
                    <div className="hidden sm:flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">Branded application page with your company logo</span>
                    </div>
                  </div>

                  <Button 
                    size="lg"
                    onClick={() => setShowForm(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    icon={<ArrowRight className="h-5 w-5" />}
                  >
                    Create Job Listing
                  </Button>
                </motion.div>

                <motion.div
                  className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <img
                    src="https://i.imgur.com/pHbItWx.jpeg"
                    alt="AI-Powered Job Posting"
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">AI Analysis in Progress</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing CV...</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '73%' }} />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Generating personalized questions based on candidate's experience...
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-24">
                <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    From Hello to Hired 
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Our AI-powered system makes recruitment effortless and effective
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-6">
                      <PlusCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Create Job Listing
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Fill out job details, requirements, and company information in our simple form
                    </p>
                  </motion.div>

                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
                      <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Candidates Apply
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Candidates submit their CV and motivation letter through your branded application page
                    </p>
                  </motion.div>

                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 mb-6">
                      <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      AI Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Our AI reads each CV and generates 3 personalized follow-up questions automatically
                    </p>
                  </motion.div>

                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900 mb-6">
                      <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Smart Ranking
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      View ranked candidates with AI scores and detailed summaries in your dashboard
                    </p>
                  </motion.div>
                </div>
              </div>

              <div className="mt-24">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 lg:p-12 text-white">
                  <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">
                      Why Choose Our AI-Powered Platform?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                      Save time, improve quality, and find the perfect candidates faster than ever before
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="text-3xl font-bold mb-2">85%</div>
                        <div className="text-blue-100">Better candidate matches</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold mb-2">12hrs</div>
                        <div className="text-blue-100">Saved per week</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold mb-2">2.5x</div>
                        <div className="text-blue-100">Faster hiring process</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            {!success ? (
              <>
                <div className="text-center mb-16">
                  <AnimatedTitle>Post a New Job</AnimatedTitle>
                  <AnimatedSubtitle>Fill out the form below to create a new job listing with AI-powered screening</AnimatedSubtitle>
                </div>

                <div className="mb-12">
                  <ProgressSteps steps={steps} currentStep={currentStep} />
                </div>
                
                <Card>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <CardContent className="p-6">
                      <StepContent isActive={currentStep === 0}>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Details</h2>
                        
                        <Input
                          label="Job Title*"
                          name="jobTitle"
                          value={formData.jobTitle}
                          onChange={handleInputChange}
                          placeholder="e.g. Senior Software Engineer"
                          error={errors.jobTitle}
                          fullWidth
                          required
                        />
                        
                        <TextArea
                          label="Job Description*"
                          name="jobDescription"
                          value={formData.jobDescription}
                          onChange={handleInputChange}
                          placeholder="Provide a detailed description of the job role"
                          rows={5}
                          error={errors.jobDescription}
                          fullWidth
                          required
                        />
                        
                        <FileUpload
                          label="Header Image (Optional)"
                          helperText="Upload a banner image for your job listing (JPG, PNG, max 5MB). This will appear at the top of your job post."
                          accept=".jpg,.jpeg,.png"
                          maxSize={5 * 1024 * 1024} // 5MB
                          onChange={handleHeaderImageChange}
                          value={formData.headerImage}
                          id="headerImage"
                        />
                        
                        <BubbleInput
                          label="Requirements"
                          value={formData.requirements}
                          onChange={(values) => setFormData({ ...formData, requirements: values })}
                          placeholder="E.g. MBA, fluent English → type and press Enter/comma"
                          fullWidth
                        />

                        <BubbleInput
                          label="Keywords/Tags"
                          value={formData.keywords}
                          onChange={(values) => setFormData({ ...formData, keywords: values })}
                          placeholder="E.g. Remote, Freelance → type and press Enter/comma"
                          helperText="Add relevant keywords and tags. Press Enter or comma to create bubbles."
                          fullWidth
                        />
                        
                        <Input
                          label="Application Deadline"
                          name="applicationDeadline"
                          type="date"
                          value={formData.applicationDeadline}
                          onChange={handleInputChange}
                          error={errors.applicationDeadline}
                          fullWidth
                        />

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                            🤖 AI-Generated Follow-up Questions
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Our AI will automatically generate 3 personalized follow-up questions for each applicant based on their actual CV content. 
                            For example: "I see you worked at McDonald's, can you tell me more about how you managed busy moments?"
                          </p>
                        </div>
                      </StepContent>

                      <StepContent isActive={currentStep === 1}>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Information</h2>
                        
                        <Input
                          label="Company Name*"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="e.g. Acme Corporation"
                          error={errors.companyName}
                          fullWidth
                          required
                        />
                        
                        <FileUpload
                          label="Company Logo"
                          accept="image/jpeg,image/png"
                          maxSize={2 * 1024 * 1024}
                          onChange={handleLogoChange}
                          value={formData.companyLogo}
                          error={errors.companyLogo}
                          helperText="Maximum file size: 2MB. Accepted formats: JPG, PNG"
                        />
                      </StepContent>

                      <StepContent isActive={currentStep === 2}>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Application Settings</h2>
                        
                        <Input
                          label="Email Address*"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                          error={errors.email}
                          helperText={
                            isLoggedIn 
                              ? "Using your logged-in email address" 
                              : emailExists 
                                ? "This email already has an account. Using existing password." 
                                : "Used for notifications and password recovery"
                          }
                          fullWidth
                          required
                          disabled={isLoggedIn}
                        />

                        <Input
                          label="Password*"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={emailExists ? "Using existing password" : "Create a secure password"}
                          error={errors.password}
                          helperText={
                            isLoggedIn 
                              ? "Using your existing password" 
                              : emailExists 
                                ? "Using the existing password for this email address" 
                                : "Choose a secure password to access your dashboard"
                          }
                          fullWidth
                          required
                          disabled={isLoggedIn || emailExists}
                        />

                        {emailExists && !isLoggedIn && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                              📧 Existing Account Detected
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              This email address already has an account. We'll use your existing password to add this new job to your account.
                              If you don't remember your password, you can <button 
                                onClick={() => navigate('/forgot', { state: { email: formData.email } })}
                                className="underline hover:no-underline"
                              >
                                recover it here
                              </button>.
                            </p>
                          </div>
                        )}

                        <div className="mb-6">
                          <label htmlFor="notificationPreference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notification Preference
                          </label>
                          <select
                            id="notificationPreference"
                            name="notificationPreference"
                            value={formData.notificationPreference}
                            onChange={handleInputChange}
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 shadow-sm transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-50 focus:outline-none"
                          >
                            <option value="0">None</option>
                            <option value="25">Notify on 25% match and above</option>
                            <option value="50">Notify on 50% match and above</option>
                            <option value="75">Notify on 75% match and above</option>
                            <option value="100">Notify on 100% match only</option>
                          </select>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Optional Application Fields
                          </h3>
                          
                          <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.optionalFields.age}
                                onChange={() => handleOptionalFieldChange('age')}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Age</span>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.optionalFields.location}
                                onChange={() => handleOptionalFieldChange('location')}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Location (city & country)</span>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.optionalFields.working_hours}
                                onChange={() => handleOptionalFieldChange('working_hours')}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Preferred weekly working hours</span>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.optionalFields.education}
                                onChange={() => handleOptionalFieldChange('education')}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Highest level of education</span>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.optionalFields.work_type}
                                onChange={() => handleOptionalFieldChange('work_type')}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Preferred work type (remote, on-site, or hybrid)</span>
                            </label>
                          </div>

                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              Custom Fields (Max 3)
                            </h4>
                            
                            {formData.customFields.length < 3 && (
                              <div className="flex gap-2 mb-4">
                                <Input
                                  value={newCustomField}
                                  onChange={(e) => setNewCustomField(e.target.value)}
                                  placeholder="Enter custom field name"
                                  className="flex-grow"
                                />
                                <Button
                                  type="button"
                                  onClick={addCustomField}
                                  disabled={!newCustomField.trim()}
                                  size="sm"
                                  icon={<PlusCircle className="h-4 w-4" />}
                                >
                                  Add
                                </Button>
                              </div>
                            )}

                            {formData.customFields.length > 0 && (
                              <div className="space-y-2">
                                {formData.customFields.map((field, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">{field}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCustomField(index)}
                                      icon={<X className="h-4 w-4" />}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {formData.customFields.length === 3 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Maximum of 3 custom fields reached
                              </p>
                            )}
                          </div>
                        </div>
                      </StepContent>

                      {errors.submit && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
                          {errors.submit}
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                      >
                        {currentStep === steps.length - 1 ? (
                          isSubmitting ? 'Posting...' : 'Post Job'
                        ) : (
                          'Next Step'
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <Card className="overflow-hidden">
                  <div className="relative bg-gradient-to-br from-green-500 to-blue-600 px-8 py-12">
                    <div className="absolute inset-0 bg-[url('https://i.imgur.com/PM9H0hy.jpeg')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm mb-6"
                      >
                        <CheckCircle className="h-12 w-12 text-white" />
                      </motion.div>
                      
                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-3xl font-bold text-white mb-4"
                      >
                        🎉 Job Posted Successfully!
                      </motion.h2>
                      
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-white/90 text-lg"
                      >
                        Your job "{jobData.jobTitle}" at {jobData.companyName} is now live and ready to receive applications with AI-powered screening!
                      </motion.p>
                    </div>
                  </div>
                  
                  <CardContent className="p-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                      className="space-y-6"
                    >
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            📝 Application Page
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(jobData.applicationUrl, 'application')}
                              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              title="Copy link"
                            >
                              {copiedField === 'application' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => window.open(jobData.applicationUrl, '_blank')}
                              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Share this link with candidates to apply for your job
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            📊 Management Dashboard
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(jobData.dashboardUrl, 'dashboard')}
                              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                              title="Copy link"
                            >
                              {copiedField === 'dashboard' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => navigate(jobData.dashboardUrl.replace(window.location.origin, ''))}
                              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                              title="Go to dashboard"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Monitor applications and view AI analysis results
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            🔑 Your Password
                          </h3>
                          <button
                            onClick={() => copyToClipboard(jobData.passcode, 'passcode')}
                            className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                            title="Copy password"
                          >
                            {copiedField === 'passcode' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {jobData.passcode}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Keep this safe - you'll need it to access your dashboard
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <Button
                          onClick={() => navigate(jobData.dashboardUrl.replace(window.location.origin, ''))}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          size="lg"
                        >
                          Go to Dashboard
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate('/')}
                          className="flex-1"
                          size="lg"
                        >
                          Return to Home
                        </Button>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PostJobPage;