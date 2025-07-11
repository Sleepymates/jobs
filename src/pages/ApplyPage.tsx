import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Briefcase,
  GraduationCap,
  User,
  X
} from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { FileUpload } from '../components/ui/FileUpload';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import type { Job } from '../supabase/types';

interface FormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  location: string;
  education: string;
  linkedinUrl: string;
  workingHours: string;
  workType: string;
  motivationText: string;
  cvFile: File | null;
  customFields: string[];
  customAnswers: string[];
}

interface FormErrors {
  [key: string]: string;
}

const ApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    age: '',
    location: '',
    education: '',
    linkedinUrl: '',
    workingHours: '',
    workType: '',
    motivationText: '',
    cvFile: null,
    customFields: [],
    customAnswers: []
  });

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) throw error;
      
      setJob(data);
      
      // Initialize custom fields
      if (data.custom_questions) {
        setFormData(prev => ({
          ...prev,
          customFields: data.custom_questions,
          customAnswers: new Array(data.custom_questions.length).fill('')
        }));
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomAnswerChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      customAnswers: prev.customAnswers.map((answer, i) => 
        i === index ? value : answer
      )
    }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, cvFile: file }));
    if (errors.cvFile) {
      setErrors(prev => ({ ...prev, cvFile: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.cvFile) newErrors.cvFile = 'CV file is required';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate custom questions
    formData.customAnswers.forEach((answer, index) => {
      if (!answer.trim()) {
        newErrors[`customAnswer${index}`] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!job) return;

    setSubmitting(true);

    try {
      // Upload CV file
      const fileExt = formData.cvFile!.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cv-files')
        .upload(fileName, formData.cvFile!);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cv-files')
        .getPublicUrl(fileName);

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
          linkedin_url: formData.linkedinUrl || null,
          working_hours: formData.workingHours ? parseInt(formData.workingHours) : null,
          work_type: formData.workType || null,
          motivation_text: formData.motivationText || null,
          cv_url: urlData.publicUrl,
          followup_questions: formData.customFields,
          followup_answers: formData.customAnswers
        });

      if (insertError) throw insertError;

      // Update analytics
      await supabase.rpc('increment_applicant_count', { job_id_param: job.job_id });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({ submit: 'Failed to submit application. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Job Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The job you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="pt-20 pb-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <Card className="overflow-hidden">
                <div className="relative bg-gradient-to-br from-green-500 to-blue-600 px-8 py-12">
                  <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
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
                      🎉 Application Submitted!
                    </motion.h2>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="text-white/90 text-lg"
                    >
                      Thank you for applying to {job.title} at {job.company_name}!
                    </motion.p>
                  </div>
                </div>
                
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        What happens next?
                      </h3>
                      <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
                        <li>• Our AI will analyze your CV and generate personalized follow-up questions</li>
                        <li>• You'll receive an email with next steps within 24 hours</li>
                        <li>• The hiring team will review your application</li>
                      </ul>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={() => navigate('/')}
                        className="flex-1"
                      >
                        Browse More Jobs
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="flex-1"
                      >
                        Apply to Another Position
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Job Header */}
          <div className="relative mb-8 rounded-xl overflow-hidden">
            {/* Header Image with Overlay */}
            <div className="relative min-h-[12rem] sm:min-h-[16rem] flex items-end">
              {/* Background Image */}
              {job.header_image_url ? (
                <img
                  src={job.header_image_url}
                  alt={`${job.company_name} header`}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700"></div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/60"></div>
              
              {/* Content */}
              <div className="relative w-full p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      {job.logo_url && (
                        <img
                          src={job.logo_url}
                          alt={`${job.company_name} logo`}
                          className="h-12 w-12 rounded-lg object-cover mr-4 bg-white/10 backdrop-blur-sm"
                        />
                      )}
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                          {job.title}
                        </h1>
                        <p className="text-white/90 text-lg">
                          {job.company_name}
                        </p>
                      </div>
                    </div>
                    
                    {/* AI-Powered Process Info */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                      <h3 className="text-white font-semibold mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        🤖 AI-Powered Application Process
                      </h3>
                      <p className="text-white/90 text-sm">
                        Our AI will analyze your CV and generate 3 personalized follow-up questions based on your actual experience 
                        and background. This helps us understand your unique qualifications better.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="ml-4 bg-white text-blue-600 hover:bg-gray-100"
                  >
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Job Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Job Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{job.description}</p>
                  </div>
                </CardContent>
              </Card>

              {job.requirements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Application Form */}
              <Card id="application-form">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Apply for this Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter your full name"
                          error={errors.name}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="your.email@example.com"
                          error={errors.email}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number *
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          error={errors.phone}
                        />
                      </div>

                      {job.optional_fields?.age && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Age
                          </label>
                          <Input
                            type="number"
                            value={formData.age}
                            onChange={(e) => handleInputChange('age', e.target.value)}
                            placeholder="25"
                            min="16"
                            max="100"
                          />
                        </div>
                      )}

                      {job.optional_fields?.location && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Location
                          </label>
                          <Input
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="City, Country"
                          />
                        </div>
                      )}

                      {job.optional_fields?.education && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Education
                          </label>
                          <Input
                            value={formData.education}
                            onChange={(e) => handleInputChange('education', e.target.value)}
                            placeholder="Bachelor's in Computer Science"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          LinkedIn Profile
                        </label>
                        <Input
                          type="url"
                          value={formData.linkedinUrl}
                          onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>

                      {job.optional_fields?.working_hours && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Preferred Working Hours (per week)
                          </label>
                          <Input
                            type="number"
                            value={formData.workingHours}
                            onChange={(e) => handleInputChange('workingHours', e.target.value)}
                            placeholder="40"
                            min="1"
                            max="80"
                          />
                        </div>
                      )}

                      {job.optional_fields?.work_type && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Preferred Work Type
                          </label>
                          <select
                            value={formData.workType}
                            onChange={(e) => handleInputChange('workType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select work type</option>
                            <option value="remote">Remote</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="onsite">On-site</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* CV Upload */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Upload CV/Resume *
                      </label>
                      <FileUpload
                        onFileChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        maxSize={5}
                        error={errors.cvFile}
                      />
                    </div>

                    {/* Motivation */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Why are you interested in this position?
                      </label>
                      <TextArea
                        value={formData.motivationText}
                        onChange={(e) => handleInputChange('motivationText', e.target.value)}
                        placeholder="Tell us what motivates you to apply for this role..."
                        rows={4}
                      />
                    </div>

                    {/* Custom Questions */}
                    {formData.customFields.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Additional Questions</h3>
                        {formData.customFields.map((question, index) => (
                          <div key={index}>
                            <label className="block text-sm font-medium mb-2">
                              {question} *
                            </label>
                            <TextArea
                              value={formData.customAnswers[index] || ''}
                              onChange={(e) => handleCustomAnswerChange(index, e.target.value)}
                              placeholder="Your answer..."
                              rows={3}
                              error={errors[`customAnswer${index}`]}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {errors.submit && (
                      <div className="text-red-600 dark:text-red-400 text-center">
                        {errors.submit}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Submitting Application...' : 'Submit Application'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Company Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm">{job.email}</span>
                  </div>
                  
                  {job.deadline && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {job.tags && job.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ApplyPage;