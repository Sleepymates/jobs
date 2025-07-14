import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Building2, Mail, Lock, Users, FileText, Tag, Image, Upload } from 'lucide-react';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/button';
import BubbleInput from '../components/ui/BubbleInput';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [notifyThreshold, setNotifyThreshold] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-fill form if job data is passed from navigation state
  useEffect(() => {
    if (location.state?.jobData) {
      const jobData = location.state.jobData;
      setTitle(jobData.title || '');
      setDescription(jobData.description || '');
      setRequirements(jobData.requirements || '');
      setCustomQuestions(jobData.customQuestions || []);
      setTags(jobData.tags || []);
      setDeadline(jobData.deadline || '');
      setEmail(jobData.email || '');
      setPasscode(jobData.passcode || '');
      setCompanyName(jobData.companyName || '');
      setLogoUrl(jobData.logoUrl || '');
      setHeaderImageUrl(jobData.headerImageUrl || '');
      setNotifyThreshold(jobData.notifyThreshold?.toString() || '10');
    }
  }, [location.state]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Job title is required';
    if (!description.trim()) newErrors.description = 'Job description is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!email.includes('@')) newErrors.email = 'Please enter a valid email';
    if (!passcode.trim()) newErrors.passcode = 'Passcode is required';
    if (passcode.length < 6) newErrors.passcode = 'Passcode must be at least 6 characters';
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (deadline && new Date(deadline) < new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    return title.trim() && 
           description.trim() && 
           email.trim() && 
           email.includes('@') && 
           passcode.trim() && 
           passcode.length >= 6 && 
           companyName.trim();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (!isFormValid()) {
        return;
      }
      
      // Prepare job data
      const jobData = {
        title,
        description,
        requirements,
        customQuestions,
        tags,
        deadline: deadline || undefined,
        email: email.toLowerCase().trim(),
        passcode,
        companyName,
        logoUrl: logoUrl || undefined,
        headerImageUrl: headerImageUrl || undefined,
        notifyThreshold: parseInt(notifyThreshold),
      };
      
      // Redirect to token purchase page with job data
      navigate('/token-purchase', { state: { jobData } });
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({
        ...errors,
        submit: 'Failed to submit form. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <motion.h1 
                className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Post a Job
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 dark:text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Find the perfect candidates for your position
              </motion.p>
            </div>

            <Card className="p-8 shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    Basic Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Job Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        error={errors.title}
                        required
                        fullWidth
                      />
                    </div>
                    
                    <Input
                      label="Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                      error={errors.companyName}
                      required
                      fullWidth
                    />
                    
                    <Input
                      label="Application Deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      error={errors.deadline}
                      fullWidth
                    />
                  </div>

                  <TextArea
                    label="Job Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                    rows={6}
                    error={errors.description}
                    required
                    fullWidth
                  />

                  <TextArea
                    label="Requirements (Optional)"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="List the required skills, experience, and qualifications..."
                    rows={4}
                    fullWidth
                  />
                </div>

                {/* Additional Details */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-6 h-6 text-purple-600" />
                    Additional Details
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Company Logo URL (Optional)"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      fullWidth
                    />
                    
                    <Input
                      label="Header Image URL (Optional)"
                      value={headerImageUrl}
                      onChange={(e) => setHeaderImageUrl(e.target.value)}
                      placeholder="https://example.com/header.jpg"
                      fullWidth
                    />
                  </div>

                  <BubbleInput
                    label="Job Tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="Add tags like 'Remote', 'Full-time', 'JavaScript'..."
                    fullWidth
                  />

                  <BubbleInput
                    label="Custom Questions for Applicants"
                    value={customQuestions}
                    onChange={setCustomQuestions}
                    placeholder="Add custom questions you'd like applicants to answer..."
                    fullWidth
                  />
                </div>

                {/* Contact & Settings */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-6 h-6 text-green-600" />
                    Contact & Settings
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Contact Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@company.com"
                      error={errors.email}
                      required
                      fullWidth
                    />
                    
                    <Input
                      label="Access Passcode"
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Create a secure passcode"
                      error={errors.passcode}
                      required
                      fullWidth
                    />
                  </div>

                  <Input
                    label="Notification Threshold"
                    type="number"
                    value={notifyThreshold}
                    onChange={(e) => setNotifyThreshold(e.target.value)}
                    placeholder="10"
                    helperText="Get notified when you reach this number of applicants"
                    fullWidth
                  />
                </div>

                {errors.submit && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
                  </div>
                )}

                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || isSubmitting}
                    className="px-8 py-3 text-lg font-semibold"
                  >
                    {isSubmitting ? 'Processing...' : 'Continue to Token Purchase'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PostJobPage;