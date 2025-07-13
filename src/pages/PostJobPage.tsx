import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/button';
import BubbleInput from '../components/ui/BubbleInput';
import { generateJobId } from '../utils/generateId';
import { Calendar, Building2, Mail, Lock, Users, FileText, Tag, Image, Upload } from 'lucide-react';

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Post a Job</h1>
            <p className="text-xl text-gray-600">Find the perfect candidates for your position</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
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
                    />
                  </div>
                  
                  <Input
                    label="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    error={errors.companyName}
                    icon={<Building2 className="w-4 h-4" />}
                    required
                  />
                  
                  <Input
                    label="Application Deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    error={errors.deadline}
                    icon={<Calendar className="w-4 h-4" />}
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
                />

                <TextArea
                  label="Requirements (Optional)"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List the required skills, experience, and qualifications..."
                  rows={4}
                />
              </div>

              {/* Additional Details */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-6 h-6 text-purple-600" />
                  Additional Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Company Logo URL (Optional)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    icon={<Upload className="w-4 h-4" />}
                  />
                  
                  <Input
                    label="Header Image URL (Optional)"
                    value={headerImageUrl}
                    onChange={(e) => setHeaderImageUrl(e.target.value)}
                    placeholder="https://example.com/header.jpg"
                    icon={<Image className="w-4 h-4" />}
                  />
                </div>

                <BubbleInput
                  label="Job Tags"
                  values={tags}
                  onChange={setTags}
                  placeholder="Add tags like 'Remote', 'Full-time', 'JavaScript'..."
                />

                <BubbleInput
                  label="Custom Questions for Applicants"
                  values={customQuestions}
                  onChange={setCustomQuestions}
                  placeholder="Add custom questions you'd like applicants to answer..."
                />
              </div>

              {/* Contact & Settings */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
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
                    icon={<Mail className="w-4 h-4" />}
                    required
                  />
                  
                  <Input
                    label="Access Passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Create a secure passcode"
                    error={errors.passcode}
                    icon={<Lock className="w-4 h-4" />}
                    required
                  />
                </div>

                <Input
                  label="Notification Threshold"
                  type="number"
                  value={notifyThreshold}
                  onChange={(e) => setNotifyThreshold(e.target.value)}
                  placeholder="10"
                  icon={<Users className="w-4 h-4" />}
                  help="Get notified when you reach this number of applicants"
                />
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{errors.submit}</p>
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
    </div>
  );
};

export default PostJobPage;