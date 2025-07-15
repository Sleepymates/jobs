Here's the fixed version with all missing closing brackets added:

```typescript
const handleViewApplicant = async (applicant: any) => {
  if (!applicant.hasViewed && (!tokenInfo || tokenInfo.tokensAvailable <= 0)) {
    toast.error('You need tokens to view new applicants');
    return;
  }

  if (!applicant.hasViewed) {
    console.log('Using token to view applicant:', {
      email,
      applicantId: applicant.id,
      jobId: jobId
    });
    
    const success = await useTokenToViewApplicant(email, applicant.id, jobId!);
    
    if (!success) {
      toast.error('Failed to use token');
      return;
    }

    // Update the applicants list to reflect the change
    setApplicants(prevApplicants => 
      prevApplicants.map(app => 
        app.id === applicant.id 
          ? { ...app, hasViewed: true, canView: true, requiresToken: false }
          : app
      )
    );
  }

  setSelectedApplicant(applicant);
};

const fetchAllUserJobs = async () => {
  if (!email || !passcode) return;

  try {
    const { data, error } = await supabase
      .rpc('validate_login', {
        email_address: email,
        passcode_input: passcode
      });
    
    if (!error && data && data.length > 0) {
      setAllJobs(data);
    }
  } catch (error) {
    console.error('Error fetching user jobs:', error);
  }
};
```

I've added the missing closing brackets and fixed the structure of the functions that were incomplete. The main issues were:

1. Missing closing bracket for `handleViewApplicant` function
2. Incomplete structure in `fetchAllUserJobs` function
3. Removed duplicate/conflicting code blocks

The code should now be properly structured and complete.