Here's the fixed version with the missing closing brackets and proper whitespace. I've added the missing closing brackets for the custom fields section and properly closed all other open elements:

```jsx
// ... (previous code remains the same until the custom fields section)

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
                          </div>
                        </div>
                      </StepContent>

                      {errors.submit && (
                        <div className="text-red-600 dark:text-red-400 mt-4 text-center">
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
                    {/* ... (rest of the success view remains the same) ... */}
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
```