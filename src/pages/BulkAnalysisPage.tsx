import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Brain, BarChart3, Download, 
  X, CheckCircle, AlertCircle, Loader2, Eye, 
  TrendingUp, Users, Award, Filter, Search,
  RefreshCw, Trash2, FileDown, FileSpreadsheet
} from 'lucide-react';
import Button from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import TextArea from '../components/ui/TextArea';
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'status'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.docx');
      
      if (!isValidType) {
        toast.error(`${file.name} is not a supported file type. Please upload PDF or DOCX files.`);
      }
      
      return isValidType;
    });

    // Check file size (max 10MB per file)
    const validSizedFiles = validFiles.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
      }
      
      return isValidSize;
    });

    // Limit to 200 files
    if (validSizedFiles.length > 200) {
      toast.error('Maximum 200 files allowed. Please select fewer files.');
      setSelectedFiles(validSizedFiles.slice(0, 200));
    } else {
      setSelectedFiles(validSizedFiles);
    }

    if (validSizedFiles.length > 0) {
      toast.success(`${validSizedFiles.length} files selected for analysis`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    if (selectedFiles.length === 0) {
      toast.error('Please select CV files to analyze');
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
        selectedFiles,
        (progressPercent, processed) => {
          setProgress(progressPercent);
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
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    const csvContent = exportResultsToCSV(filteredResults);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadCSV(csvContent, `cv_analysis_results_${timestamp}.csv`);
    toast.success('Results exported to CSV');
  };

  const handleExportDetailed = () => {
    if (results.length === 0) return;
    
    const detailedContent = exportDetailedSummaries(filteredResults);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadTextFile(detailedContent, `cv_analysis_detailed_${timestamp}.txt`);
    toast.success('Detailed summaries exported');
  };

  const handleReset = () => {
    setJobDescription('');
    setSelectedFiles([]);
    setResults([]);
    setShowResults(false);
    setProgress(0);
    setProcessedCount(0);
    setSearchQuery('');
    setScoreFilter('all');
    setSortBy('score');
    setSortOrder('desc');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Analysis reset');
  };

  // Filter and sort results
  const filteredResults = results
    .filter(result => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          result.fileName.toLowerCase().includes(query) ||
          result.summary.toLowerCase().includes(query) ||
          result.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      // Score filter
      if (scoreFilter !== 'all') {
        if (result.status !== 'completed') return scoreFilter === 'low';
        
        switch (scoreFilter) {
          case 'high':
            return result.matchScore >= 70;
          case 'medium':
            return result.matchScore >= 40 && result.matchScore < 70;
          case 'low':
            return result.matchScore < 40;
          default:
            return true;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = (a.matchScore || 0) - (b.matchScore || 0);
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const stats = results.length > 0 ? getAnalysisStats(results) : null;
  const topCandidates = results.length > 0 ? getTopCandidates(results, 5) : [];

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
            {/* Header Section */}
            <div className="text-center mb-12">
              <AnimatedTitle text="AI-Powered Bulk CV Analysis" />
              <AnimatedSubtitle text="Upload up to 200 CVs and get instant AI-powered analysis and ranking" />
            </div>

            {!showResults ? (
              /* Analysis Setup */
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Job Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Job Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TextArea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Enter the job description, requirements, and key qualifications you're looking for. Be specific about required skills, experience level, and any other important criteria. Minimum 100 characters required for accurate analysis."
                      rows={8}
                      fullWidth
                    />
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {jobDescription.length}/100 characters minimum
                    </div>
                  </CardContent>
                </Card>

                {/* File Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Upload className="h-5 w-5 mr-2" />
                        Upload CV Files
                      </div>
                      {selectedFiles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFiles}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Click to upload CV files
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Supports PDF and DOCX files • Max 10MB per file • Up to 200 files
                        </p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Selected Files ({selectedFiles.length})
                            </h4>
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between py-1">
                                <div className="flex items-center flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                    ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="ml-2 p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Button */}
                <div className="text-center">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !jobDescription.trim() || selectedFiles.length === 0}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Analyzing CVs... ({processedCount}/{selectedFiles.length})
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5 mr-2" />
                        Analyze {selectedFiles.length} CVs with AI
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress Bar */}
                {isAnalyzing && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Analysis Progress
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <motion.div
                            className="bg-blue-600 h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          Processing {processedCount} of {selectedFiles.length} CVs...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Results Section */
              <div className="space-y-8">
                {/* Results Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Analysis Results
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {results.length} CVs analyzed • {stats?.completed || 0} successful • {stats?.failed || 0} failed
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={results.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportDetailed}
                      disabled={results.length === 0}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Detailed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      New Analysis
                    </Button>
                  </div>
                </div>

                {/* Statistics Cards */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Users className="h-8 w-8 text-blue-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total CVs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Analyzed</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgScore}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Award className="h-8 w-8 text-yellow-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Top Candidates</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scoreRanges.excellent}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Filters and Search */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Search */}
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search by filename, summary, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Score Filter */}
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                          value={scoreFilter}
                          onChange={(e) => setScoreFilter(e.target.value as any)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="all">All Scores</option>
                          <option value="high">High (70%+)</option>
                          <option value="medium">Medium (40-69%)</option>
                          <option value="low">Low (<40%)</option>
                        </select>
                      </div>

                      {/* Sort */}
                      <div className="flex items-center gap-2">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="score">Sort by Score</option>
                          <option value="name">Sort by Name</option>
                          <option value="status">Sort by Status</option>
                        </select>
                        
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6" onClick={() => setSelectedResult(result)}>
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {result.fileName}
                                </h3>
                                <div className="flex items-center mt-1">
                                  {result.status === 'completed' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                  )}
                                  <span className={`text-xs ${
                                    result.status === 'completed' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {result.status === 'completed' ? 'Analyzed' : 'Failed'}
                                  </span>
                                </div>
                              </div>
                              
                              {result.status === 'completed' && (
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  result.matchScore >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  result.matchScore >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {result.matchScore}%
                                </div>
                              )}
                            </div>

                            {/* Summary */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                              {result.summary}
                            </p>

                            {/* Tags */}
                            {result.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {result.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {result.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                    +{result.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Stats */}
                            {result.status === 'completed' && result.extractedTextLength && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <div>Text: {result.extractedTextLength} chars</div>
                                {result.wordCount && <div>Words: {result.wordCount}</div>}
                                {result.pageCount && <div>Pages: {result.pageCount}</div>}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {filteredResults.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No results found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Result Detail Modal */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analysis Details: {selectedResult.fileName}
                  </h3>
                  <div className="flex items-center mt-2">
                    {selectedResult.status === 'completed' ? (
                      <>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium mr-3 ${
                          selectedResult.matchScore >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          selectedResult.matchScore >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          Match Score: {selectedResult.matchScore}%
                        </div>
                        {selectedResult.matchScore >= 70 && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                            TOP
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 text-sm rounded-full">
                        Analysis Failed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = exportResultsToCSV([selectedResult]);
                      downloadCSV(csvContent, `${selectedResult.fileName}_analysis.csv`);
                      toast.success('CV analysis downloaded');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download CV
                  </Button>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Tags */}
                {selectedResult.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Summary */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {selectedResult.status === 'completed' ? (
                      <>
                        🏆 TOP 1 CANDIDATE - DETAILED ANALYSIS
                      </>
                    ) : (
                      'Analysis Summary'
                    )}
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {selectedResult.summary}
                    </p>
                  </div>
                </div>

                {/* File Stats */}
                {selectedResult.status === 'completed' && selectedResult.extractedTextLength && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">File Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Characters</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedResult.extractedTextLength?.toLocaleString()}
                        </div>
                      </div>
                      {selectedResult.wordCount && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Words</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedResult.wordCount.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {selectedResult.pageCount && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Pages</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedResult.pageCount}
                          </div>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {selectedResult.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {selectedResult.status === 'error' && selectedResult.error && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Error Details</h4>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-800 dark:text-red-300 text-sm">
                        {selectedResult.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default BulkAnalysisPage;