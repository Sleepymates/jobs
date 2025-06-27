import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Brain, Download, Trash2, 
  CheckCircle, AlertCircle, BarChart3, Users,
  Filter, Search, ArrowUpDown, Eye, X,
  Loader2, Play, Pause, RotateCcw, FileX,
  Star, Award, TrendingUp, Clock, ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
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
  getTopCandidates
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
  cvFile?: File;
}

interface JobDescription {
  title: string;
  description: string;
  requirements: string;
  keywords: string[];
}

interface AnalysisStats {
  totalFiles: number;
  processedFiles: number;
  averageScore: number;
  topScore: number;
  completionRate: number;
}

const BulkAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState<JobDescription>({
    title: '',
    description: '',
    requirements: '',
    keywords: []
  });
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'job-description' | 'analysis' | 'results'>('upload');
  const [showResults, setShowResults] = useState(false);
  const [filterScore, setFilterScore] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // File handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const pdfFiles = uploadedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== uploadedFiles.length) {
      alert('Please upload only PDF files.');
      return;
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setResults([]);
    setShowResults(false);
    setCurrentStep('upload');
  };

  // Job description handling
  const handleJobDescriptionChange = (field: keyof JobDescription, value: string | string[]) => {
    setJobDescription(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !jobDescription.keywords.includes(keyword.trim())) {
      setJobDescription(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword.trim()]
      }));
    }
  };

  const removeKeyword = (index: number) => {
    setJobDescription(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  // Analysis
  const startAnalysis = async () => {
    if (files.length === 0) {
      alert('Please upload at least one CV file.');
      return;
    }

    if (!jobDescription.title || !jobDescription.description) {
      alert('Please provide job title and description.');
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep('analysis');
    setAnalysisProgress(0);

    try {
      const analysisResults = await analyzeBulkCVs(
        files,
        jobDescription,
        (progress) => setAnalysisProgress(progress)
      );
      
      setResults(analysisResults);
      setCurrentStep('results');
      setShowResults(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Results filtering and sorting
  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = results.filter(result => {
      const matchesScore = result.matchScore >= filterScore;
      const matchesSearch = searchTerm === '' || 
        result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesScore && matchesSearch;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = a.matchScore - b.matchScore;
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = 0; // Would need timestamp data
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [results, filterScore, searchTerm, sortBy, sortOrder]);

  // Export functions
  const handleExportCSV = () => {
    const csvData = exportResultsToCSV(filteredAndSortedResults);
    downloadCSV(csvData, `cv-analysis-results-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportDetailed = () => {
    const detailedData = exportDetailedSummaries(filteredAndSortedResults, jobDescription);
    downloadTextFile(detailedData, `detailed-analysis-${new Date().toISOString().split('T')[0]}.txt`);
  };

  // Statistics
  const stats: AnalysisStats = React.useMemo(() => {
    return getAnalysisStats(results);
  }, [results]);

  const topCandidates = React.useMemo(() => {
    return getTopCandidates(results, 5);
  }, [results]);

  // UI Components
  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <AnimatedTitle className="text-3xl font-bold text-gray-900 mb-4">
          Upload CV Files
        </AnimatedTitle>
        <AnimatedSubtitle className="text-lg text-gray-600 mb-8">
          Upload multiple PDF files to analyze against your job requirements
        </AnimatedSubtitle>
      </div>

      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="p-8">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drop your CV files here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF files only. Maximum 50 files.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4"
              size="lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Uploaded Files ({files.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFiles}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setCurrentStep('job-description')}
              className="w-full"
              size="lg"
            >
              Continue to Job Description
            </Button>
          </CardFooter>
        </Card>
      )}
    </motion.div>
  );

  const renderJobDescriptionStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <AnimatedTitle className="text-3xl font-bold text-gray-900 mb-4">
          Job Description
        </AnimatedTitle>
        <AnimatedSubtitle className="text-lg text-gray-600 mb-8">
          Provide details about the position to match against CVs
        </AnimatedSubtitle>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <Input
              value={jobDescription.title}
              onChange={(e) => handleJobDescriptionChange('title', e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <TextArea
              value={jobDescription.description}
              onChange={(e) => handleJobDescriptionChange('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              rows={6}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements
            </label>
            <TextArea
              value={jobDescription.requirements}
              onChange={(e) => handleJobDescriptionChange('requirements', e.target.value)}
              placeholder="List specific requirements, qualifications, and skills..."
              rows={4}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <div className="space-y-2">
              <Input
                placeholder="Add keywords (press Enter to add)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full"
              />
              {jobDescription.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {jobDescription.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('upload')}
          >
            Back to Upload
          </Button>
          <Button
            onClick={startAnalysis}
            disabled={!jobDescription.title || !jobDescription.description}
            size="lg"
          >
            <Brain className="w-4 h-4 mr-2" />
            Start Analysis
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );

  const renderAnalysisStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <AnimatedTitle className="text-3xl font-bold text-gray-900 mb-4">
          Analyzing CVs
        </AnimatedTitle>
        <AnimatedSubtitle className="text-lg text-gray-600 mb-8">
          AI is processing your files and matching them against the job requirements
        </AnimatedSubtitle>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Processing {files.length} CV files...
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderResultsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <AnimatedTitle className="text-3xl font-bold text-gray-900 mb-2">
            Analysis Results
          </AnimatedTitle>
          <AnimatedSubtitle className="text-lg text-gray-600">
            {results.length} CVs analyzed with AI-powered matching
          </AnimatedSubtitle>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportDetailed}
            className="flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Detailed
          </Button>
          <Button
            onClick={() => {
              setCurrentStep('upload');
              setResults([]);
              setShowResults(false);
            }}
          >
            New Analysis
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
                <p className="text-sm text-gray-600">Total CVs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.topScore}%</p>
                <p className="text-sm text-gray-600">Top Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Min Score:</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScore}
                onChange={(e) => setFilterScore(Number(e.target.value))}
                className="w-20"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search CVs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'score' | 'name' | 'date');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="score-desc">Score (High to Low)</option>
                <option value="score-asc">Score (Low to High)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Candidates */}
      {topCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Top Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topCandidates.map((candidate, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedResult(candidate);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Award className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium">#{index + 1}</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {candidate.matchScore}%
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate mb-1">
                    {candidate.fileName}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {candidate.summary}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {candidate.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{candidate.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Results ({filteredAndSortedResults.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAndSortedResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{result.fileName}</h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-lg font-bold ${
                          result.matchScore >= 80
                            ? 'text-green-600'
                            : result.matchScore >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {result.matchScore}%
                      </span>
                      {result.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {result.summary}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {result.tags.slice(0, 5).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {result.tags.length > 5 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{result.tags.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedResult(result);
                    setShowDetailModal(true);
                  }}
                  className="ml-4"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Detail Modal
  const renderDetailModal = () => (
    <AnimatePresence>
      {showDetailModal && selectedResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetailModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedResult.fileName}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-2xl font-bold ${
                        selectedResult.matchScore >= 80
                          ? 'text-green-600'
                          : selectedResult.matchScore >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {selectedResult.matchScore}% Match
                    </span>
                    {selectedResult.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">AI Summary</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedResult.summary}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Skills & Keywords ({selectedResult.tags.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedResult.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedResult.error && (
                  <div>
                    <h3 className="font-medium text-red-900 mb-2">Error</h3>
                    <p className="text-red-700 bg-red-50 p-3 rounded-lg">
                      {selectedResult.error}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedResult.extractedTextLength && (
                    <div>
                      <span className="font-medium text-gray-700">Text Length:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedResult.extractedTextLength.toLocaleString()} characters
                      </span>
                    </div>
                  )}
                  {selectedResult.wordCount && (
                    <div>
                      <span className="font-medium text-gray-700">Word Count:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedResult.wordCount.toLocaleString()} words
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <FloatingPaths />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[
                { key: 'upload', label: 'Upload', icon: Upload },
                { key: 'job-description', label: 'Job Description', icon: FileText },
                { key: 'analysis', label: 'Analysis', icon: Brain },
                { key: 'results', label: 'Results', icon: BarChart3 }
              ].map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.key;
                const isCompleted = ['upload', 'job-description', 'analysis'].indexOf(currentStep) > 
                                  ['upload', 'job-description', 'analysis'].indexOf(step.key);
                
                return (
                  <div key={step.key} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {index < 3 && (
                      <div
                        className={`w-8 h-0.5 mx-4 ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'job-description' && renderJobDescriptionStep()}
          {currentStep === 'analysis' && renderAnalysisStep()}
          {currentStep === 'results' && renderResultsStep()}
        </div>
      </main>

      {renderDetailModal()}
      <Footer />
    </div>
  );
};

export default BulkAnalysisPage;