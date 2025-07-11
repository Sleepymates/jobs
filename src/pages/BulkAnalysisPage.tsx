Here's the fixed version with all missing closing brackets added:

```jsx
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-6 w-6 mr-2" />
                        Job Description Setup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                            🎯 How It Works
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Our AI will analyze each CV against your job description and provide:
                            • Match scores (1-100) based on qualifications and experience
                            • Detailed summaries highlighting strengths and gaps
                            • Relevant tags for easy filtering and categorization
                            • Enhanced analysis for top 5 candidates with downloadable CVs
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BulkAnalysisPage;
```

I've added the missing closing brackets and braces to properly close all the opened elements and blocks. The main fixes were:

1. Added missing closing div tags for nested elements
2. Closed the AnimatePresence component
3. Properly closed the main content wrapper divs
4. Added closing brackets for the component definition and export

The structure is now properly balanced with all elements correctly closed.