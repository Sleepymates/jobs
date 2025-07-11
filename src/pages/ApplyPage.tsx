Here's the fixed version with all missing closing brackets added:

```typescript
// ... rest of the code remains the same ...

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
```