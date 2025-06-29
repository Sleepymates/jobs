import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Brain, Download, BarChart3, 
  CheckCircle, AlertCircle, Clock, Loader2, 
  ChevronDown, ChevronUp, Eye, X, ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { 
  analyzeBulkCVs, 
  exportResultsToCSV, 
  exportDetailedSummaries,
  downloadCSV, 
  downloadTextFile,
  getAnalysisStats,
  filterResultsByScore,
  getTopCandidates,
  resetScoreTracking
} from '../utils/bulkAnalysis';

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
  const [step, setStep] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [jobDescription, setJobDescription] = useState('');
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const [filterScore, setFilterScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only PDF and DOCX files are supported.');
    } else {
      setError(null);
    }
    
    setCvFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setCvFiles(files => files.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description');
      return;
    }
    
    if (cvFiles.length === 0) {
      setError('Please upload at least one CV file');
      return;
    }

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      setError('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      return;
    }

    setIsAnalyzing(true);
    setStep('analyzing');
    setProgress(0);
    setProcessedCount(0);
    setError(null);
    
    // Reset score tracking for new analysis
    resetScoreTracking();

    try {
      const analysisResults = await analyzeBulkCVs(
        jobDescription,
        cvFiles,
        (progressPercent, processed) => {
          setProgress(progressPercent);
          if (processed !== undefined) {
            setProcessedCount(processed);
          }
        }
      );
      
      setResults(analysisResults);
      setStep('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
      setStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSummary = (index: number) => {
    const newExpanded = new Set(expandedSummaries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSummaries(newExpanded);
  };

  const handleExportCSV = () => {
    const csvContent = exportResultsToCSV(results);
    downloadCSV(csvContent, `cv_analysis_results_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportDetailed = () => {
    const detailedContent = exportDetailedSummaries(results);
    downloadTextFile(detailedContent, `cv_analysis_detailed_${new Date().toISOString().split('T')[0]}.txt`);
  };

  const handleStartOver = () => {
    setStep('upload');
    setJobDescription('');
    setCvFiles([]);
    setResults([]);
    setProgress(0);
    setProcessedCount(0);
    setError(null);
    setExpandedSummaries(new Set());
    setFilterScore(0);
    setSortBy('score');
  };

  // Filter and sort results
  const filteredResults = results
    .filter(result => result.status === 'completed' ? result.matchScore >= filterScore : true)
    .sort((a, b) => {
      if (sortBy === 'score') {
        if (a.status === 'completed' && b.status === 'completed') {
          return b.matchScore - a.matchScore;
        }
        return a.status === 'completed' ? -1 : 1;
      } else {
        return a.fileName.localeCompare(b.fileName);
      }
    });

  const stats = getAnalysisStats(results);
  const topCandidates = getTopCandidates(results, 5);

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        <Header />
        <main className="flex-grow flex items-center justify-center py-8">
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none">
              <FloatingPaths position={1} />
            </div>
            
            <div className="relative z-10 max-w-2xl mx-auto px-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                      <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Analyzing CVs with AI
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Processing {cvFiles.length} CV files against your job description
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <motion.div
                        className="bg-blue-600 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Processed: {processedCount} / {cvFiles.length} files
                  </div>
                  
                  {error && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
        <Header />
        <main className="flex-grow py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Analysis Results
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  AI analysis completed for {results.length} CV files
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleStartOver}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Start Over
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportDetailed}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export Detailed
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900 mr-4">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total CVs</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-green-100 dark:bg-green-900 mr-4">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Analyzed</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900 mr-4">
                      <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Score</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.avgScore}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900 mr-4">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.failed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by minimum score
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterScore}
                      onChange={(e) => setFilterScore(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>0%</span>
                      <span className="font-medium">{filterScore}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'score' | 'name')}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
                    >
                      <option value="score">Score (High to Low)</option>
                      <option value="name">File Name (A-Z)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results List */}
            <div className="space-y-4">
              {filteredResults.map((result, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {result.fileName}
                          </h3>
                          {result.status === 'completed' ? (
                            <div className={`
                              px-3 py-1 rounded-full text-sm font-medium
                              ${result.matchScore >= 80 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                result.matchScore >= 60 ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                                result.matchScore >= 40 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
                                'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'}
                            `}>
                              {result.matchScore}% Match
                            </div>
                          ) : (
                            <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                              Failed
                            </div>
                          )}
                        </div>
                        
                        {result.status === 'completed' && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {result.tags.slice(0, 4).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                            {result.tags.length > 4 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-md">
                                +{result.tags.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        {result.status === 'error' && result.error && (
                          <p className="text-red-600 dark:text-red-400 text-sm mb-3">
                            Error: {result.error}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {result.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSummary(index)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            {expandedSummaries.has(index) ? 'Hide' : 'View'} Summary
                            {expandedSummaries.has(index) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedSummaries.has(index) && result.status === 'completed' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                AI Analysis Summary
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSummary(index)}
                                className="p-1 h-auto"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {result.summary}
                              </p>
                              
                              {(result.extractedTextLength || result.wordCount || result.pageCount) && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {result.extractedTextLength && (
                                      <span>Text: {result.extractedTextLength.toLocaleString()} chars</span>
                                    )}
                                    {result.wordCount && (
                                      <span>Words: {result.wordCount.toLocaleString()}</span>
                                    )}
                                    {result.pageCount && (
                                      <span>Pages: {result.pageCount}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredResults.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No results match your filters
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting the minimum score filter to see more results.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
            <div className="text-center mb-12">
              <AnimatedTitle text="Bulk CV Analysis" />
              <AnimatedSubtitle text="Upload multiple CVs and analyze them against your job description using AI" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  AI-Powered CV Analysis
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                <div>
                  <TextArea
                    label="Job Description*"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste your job description here. Include requirements, skills, and qualifications you're looking for..."
                    rows={8}
                    fullWidth
                    helperText="Provide a detailed job description for accurate CV matching"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload CV Files* (PDF or DOCX, max 200 files)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-gray-400">
                        Drop CV files here or click to browse
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cv-upload"
                      />
                      <label
                        htmlFor="cv-upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        Choose Files
                      </label>
                    </div>
                  </div>
                  
                  {cvFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selected Files ({cvFiles.length})
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {cvFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
                    {error}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    🤖 How it works
                  </h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Upload up to 200 CV files (PDF or DOCX format)</li>
                    <li>• AI extracts text and analyzes each CV against your job description</li>
                    <li>• Get match scores, detailed summaries, and relevant tags</li>
                    <li>• Export results to CSV or detailed text format</li>
                  </ul>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim() || cvFiles.length === 0 || isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing CVs...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" />
                      Analyze {cvFiles.length} CV{cvFiles.length !== 1 ? 's' : ''} with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BulkAnalysisPage;