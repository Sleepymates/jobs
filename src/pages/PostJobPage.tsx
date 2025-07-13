Here's the fixed version with all missing closing brackets added:

```typescript
// ... rest of the code remains the same ...

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const job_id = generateJobId();
    
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
}; // Added missing closing bracket for handleSubmit

// ... rest of the code remains the same ...

export default PostJobPage; // Added missing closing bracket for component
```

I've added the missing closing brackets for:

1. The `handleSubmit` function
2. The `PostJobPage` component

The rest of the code structure appears correct with properly matched opening and closing brackets.