import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, BarChart3, Download, AlertCircle, CheckCircle, Loader2, Brain, Users, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/button';
import TextArea from '../components/ui/TextArea';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { analyzeBulkCVs, exportResultsToCSV, downloadCSV, getAnalysisStats, resetScoreTracking } from '../utils/bulkAnalysis';
import toast from 'react-hot-toast';

interface AnalysisResult {
  fileName: string;
  matchScore: number;
  summary: string;
  tags: string[];
  status: 'completed' | 'error';
  error?: string;
  extractedTextLength?: number;
  pageCount?: number;
  wordCount?: number;
}

const BulkAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [jobDescription, setJobDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Filter for supported file types
    const supportedFiles = selectedFiles.filter(file => {
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      return type === 'application/pdf' || 
             type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             name.endsWith('.pdf') || 
             name.endsWith('.docx');
    });

    if (supportedFiles.length !== selectedFiles.length) {
      toast.error('Some files were skipped. Only PDF and DOCX files are supported.');
    }

    if (supportedFiles.length > 200) {
      toast.error('Maximum 200 files allowed. Only the first 200 files will be processed.');
      setFiles(prev => [...prev, ...supportedFiles.slice(0, 200 - prev.length)]);
    } else {
      setFiles(prev => [...prev, ...supportedFiles]);
    }

    // Clear the input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setResults([]);
    setProgress(0);
    setProcessedCount(0);
  };

  const startAnalysis = async () => {
    if (files.length === 0) {
      toast.error('Please upload at least one CV file');
      return;
    }

    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (jobDescription.trim().length < 100) {
      toast.error('Job description must be at least 100 characters for accurate analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);
    setProgress(0);
    setProcessedCount(0);

    // Reset score tracking for new analysis
    resetScoreTracking();

    try {
      console.log('🚀 Starting bulk CV analysis...');
      
      const analysisResults = await analyzeBulkCVs(
        jobDescription.trim(),
        files,
        (progressPercent, processed) => {
          setProgress(progressPercent);
          if (processed !== undefined) {
            setProcessedCount(processed);
          }
        }
      );

      setResults(analysisResults);
      
      const stats = getAnalysisStats(analysisResults);
      toast.success(
        `Analysis complete! ${stats.completed} CVs analyzed successfully. Average score: ${stats.avgScore}%`
      );

    } catch (error) {
      console.error('❌ Bulk analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }

    try {
      const csvContent = exportResultsToCSV(results);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      downloadCSV(csvContent, `cv-analysis-results-${timestamp}.csv`);
      toast.success('Results exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export results');
    }
  };

  const getStatusIcon = (status: AnalysisResult['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  const stats = getAnalysisStats(results);

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AnimatedTitle text="AI-Powered Bulk CV Analysis" />
                <AnimatedSubtitle text="Upload up to 200 CVs and get instant AI-powered analysis with detailed scoring and insights" />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Analysis Panel */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-6 w-6 text-blue-600" />
                      CV Analysis Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Job Description */}
                    <div>
                      <TextArea
                        label="Job Description*"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Enter the complete job description including requirements, responsibilities, and desired qualifications. The more detailed, the better the AI analysis will be."
                        rows={6}
                        fullWidth
                        helperText={`${jobDescription.length}/100 characters minimum required`}
                        error={jobDescription.length > 0 && jobDescription.length < 100 ? 'Job description must be at least 100 characters' : undefined}
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload CV Files* (PDF, DOCX)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Drop CV files here or click to browse
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                          Supports PDF and DOCX files • Max 200 files • 10MB per file
                        </p>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="cv-upload"
                          disabled={isAnalyzing}
                        />
                        <Button
                          onClick={() => document.getElementById('cv-upload')?.click()}
                          variant="outline"
                          disabled={isAnalyzing}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Select Files
                        </Button>
                      </div>
                    </div>

                    {/* Uploaded Files */}
                    {files.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Uploaded Files ({files.length}/200)
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFiles}
                            disabled={isAnalyzing}
                          >
                            Clear All
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                disabled={isAnalyzing}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analysis Progress */}
                    {isAnalyzing && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-300">
                            Analyzing CVs... ({processedCount}/{files.length})
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          {progress < 5 ? 'Initializing analysis...' :
                           progress < 95 ? 'Processing CV content with AI...' :
                           'Finalizing results...'}
                        </p>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-800 dark:text-red-300">Analysis Failed</span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={startAnalysis}
                        disabled={files.length === 0 || !jobDescription.trim() || jobDescription.length < 100 || isAnalyzing}
                        className="flex-1"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Start AI Analysis
                          </>
                        )}
                      </Button>

                      {results.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={handleExportCSV}
                          disabled={isAnalyzing}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Results
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Panel */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      Analysis Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total CVs</span>
                        <span className="font-semibold">{stats.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Analyzed</span>
                        <span className="font-semibold text-green-600">{stats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
                        <span className="font-semibold text-red-600">{stats.failed}</span>
                      </div>
                      {stats.completed > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Avg Score</span>
                          <span className="font-semibold">{stats.avgScore}%</span>
                        </div>
                      )}
                    </div>

                    {stats.completed > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score Distribution</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600">Excellent (80+)</span>
                            <span>{stats.scoreRanges.excellent}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-600">Good (60-79)</span>
                            <span>{stats.scoreRanges.good}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-yellow-600">Moderate (40-59)</span>
                            <span>{stats.scoreRanges.moderate}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-red-600">Poor (<40)</span>
                            <span>{stats.scoreRanges.poor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Features */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Analysis Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Smart Content Extraction</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Advanced PDF and DOCX text extraction</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Candidate Scoring</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">1-100 match score with detailed reasoning</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Instant Results</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Process 200 CVs in minutes</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Results Section */}
            {results.length > 0 && (
              <div className="mt-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        Analysis Results ({results.length})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getStatusIcon(result.status)}
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {result.fileName}
                              </span>
                            </div>
                            {result.status === 'completed' && (
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(result.matchScore)}`}>
                                {result.matchScore}%
                              </div>
                            )}
                          </div>

                          {result.status === 'completed' && (
                            <>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                                {result.summary}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {result.tags.slice(0, 5).map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {result.tags.length > 5 && (
                                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                    +{result.tags.length - 5} more
                                  </span>
                                )}
                              </div>
                            </>
                          )}

                          {result.status === 'error' && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {result.error || 'Analysis failed for this CV'}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BulkAnalysisPage;