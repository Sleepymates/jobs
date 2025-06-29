import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Brain, Download, BarChart3, Users, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import FileUpload from '../components/ui/FileUpload';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { analyzeBulkCVs, exportResultsToCSV, exportDetailedSummaries, downloadCSV, downloadTextFile, getAnalysisStats, filterResultsByScore, getTopCandidates } from '../utils/bulkAnalysis';
import { resetScoreTracking } from '../utils/openaiAnalysis';
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
  const [jobDescription, setJobDescription] = useState('');
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.docx');
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid file type. Please upload PDF or DOCX files only.`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 200) {
      toast.error('Maximum 200 files allowed. Please select fewer files.');
      return;
    }

    setCvFiles(validFiles);
    toast.success(`${validFiles.length} files selected for analysis`);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (jobDescription.trim().length < 100) {
      toast.error('Job description must be at least 100 characters for accurate analysis');
      return;
    }

    if (cvFiles.length === 0) {
      toast.error('Please upload CV files to analyze');
      return;
    }

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      toast.error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setProcessedCount(0);
    setResults([]);
    setShowResults(false);

    // Reset score tracking for new analysis
    resetScoreTracking();

    try {
      const analysisResults = await analyzeBulkCVs(
        jobDescription,
        cvFiles,
        (progress, processed) => {
          setProgress(progress);
          if (processed !== undefined) {
            setProcessedCount(processed);
          }
        }
      );

      setResults(analysisResults);
      setShowResults(true);
      
      const stats = getAnalysisStats(analysisResults);
      toast.success(`Analysis complete! ${stats.completed} CVs analyzed successfully.`);
      
    } catch (error) {
      console.error('Bulk analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportResultsToCSV(filteredResults);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadCSV(csvContent, `cv_analysis_results_${timestamp}.csv`);
    toast.success('CSV file downloaded successfully!');
  };

  const handleExportDetailed = () => {
    const detailedContent = exportDetailedSummaries(filteredResults);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadTextFile(detailedContent, `cv_analysis_detailed_${timestamp}.txt`);
    toast.success('Detailed report downloaded successfully!');
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setResults([]);
    setProgress(0);
    setProcessedCount(0);
  };

  // Filter and sort results
  const filteredResults = results.filter(result => {
    if (selectedScoreRange === 'all') return true;
    if (selectedScoreRange === 'high') return result.matchScore >= 70;
    if (selectedScoreRange === 'medium') return result.matchScore >= 50 && result.matchScore < 70;
    if (selectedScoreRange === 'low') return result.matchScore < 50;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'score') {
      return sortOrder === 'desc' ? b.matchScore - a.matchScore : a.matchScore - b.matchScore;
    } else {
      const comparison = a.fileName.localeCompare(b.fileName);
      return sortOrder === 'desc' ? -comparison : comparison;
    }
  });

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
              <AnimatedTitle text="AI-Powered Bulk CV Analysis" />
              <AnimatedSubtitle text="Upload multiple CVs and get instant AI-powered analysis and ranking" />
            </div>

            {!showResults ? (
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-6 w-6" />
                      Bulk CV Analysis Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <TextArea
                      label="Job Description*"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Enter the job description, requirements, and qualifications you're looking for..."
                      rows={8}
                      fullWidth
                      helperText="Minimum 100 characters required for accurate analysis"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload CV Files* (PDF or DOCX, max 200 files)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.docx"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                          id="cv-upload"
                        />
                        <label htmlFor="cv-upload" className="cursor-pointer">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            Click to upload CV files
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Supports PDF and DOCX files, up to 10MB each
                          </p>
                        </label>
                      </div>
                      
                      {cvFiles.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            {cvFiles.length} files selected for analysis
                          </p>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {cvFiles.slice(0, 10).map((file, index) => (
                              <p key={index} className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                {file.name}
                              </p>
                            ))}
                            {cvFiles.length > 10 && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                ... and {cvFiles.length - 10} more files
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                        💡 Analysis Features
                      </h3>
                      <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                        <li>• AI-powered text extraction from PDF and DOCX files</li>
                        <li>• Intelligent scoring based on job requirements</li>
                        <li>• Detailed candidate summaries and skill tags</li>
                        <li>• Exportable results in CSV and detailed text formats</li>
                        <li>• Advanced filtering and sorting options</li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !jobDescription.trim() || cvFiles.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Analyzing CVs... ({processedCount}/{cvFiles.length})
                        </>
                      ) : (
                        <>
                          <Brain className="h-5 w-5 mr-2" />
                          Start AI Analysis ({cvFiles.length} files)
                        </>
                      )}
                    </Button>

                    {isAnalyzing && (
                      <div className="space-y-4">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <motion.div
                            className="bg-blue-600 h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                          Processing {processedCount} of {cvFiles.length} files ({Math.round(progress)}% complete)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Results Header with Close Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Analysis Results
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {stats.completed} CVs analyzed successfully
                    </p>
                  </div>
                  <Button
                    onClick={handleCloseResults}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Close Results
                  </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total CVs</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Analyzed</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Score</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgScore}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Controls */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <select
                          value={selectedScoreRange}
                          onChange={(e) => setSelectedScoreRange(e.target.value)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="all">All Scores</option>
                          <option value="high">High (70%+)</option>
                          <option value="medium">Medium (50-69%)</option>
                          <option value="low">Low (&lt;50%)</option>
                        </select>

                        <select
                          value={`${sortBy}-${sortOrder}`}
                          onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field as 'score' | 'name');
                            setSortOrder(order as 'asc' | 'desc');
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="score-desc">Score (High to Low)</option>
                          <option value="score-asc">Score (Low to High)</option>
                          <option value="name-asc">Name (A to Z)</option>
                          <option value="name-desc">Name (Z to A)</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleExportCSV}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                        <Button
                          onClick={handleExportDetailed}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Detailed Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Results List */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredResults.length} of {results.length} results
                  </p>
                  
                  <AnimatePresence>
                    {filteredResults.map((result, index) => (
                      <motion.div
                        key={result.fileName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`${result.status === 'error' ? 'border-red-200 dark:border-red-800' : ''}`}>
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <FileText className="h-5 w-5 text-gray-500" />
                                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                    {result.fileName}
                                  </h3>
                                  {result.status === 'completed' ? (
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      result.matchScore >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                      result.matchScore >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                      {result.matchScore}% Match
                                    </div>
                                  ) : (
                                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                      Error
                                    </div>
                                  )}
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                                  {result.summary}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  {result.tags.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                {result.extractedTextLength && (
                                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                    Extracted: {result.extractedTextLength} chars
                                    {result.wordCount && ` • ${result.wordCount} words`}
                                    {result.pageCount && ` • ${result.pageCount} pages`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredResults.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          No results match the selected filters.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
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