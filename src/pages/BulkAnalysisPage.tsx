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
  
  // Core state
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
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string>('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'upload' | 'results' | 'insights'>('upload');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'status'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterScore, setFilterScore] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [showTopCandidates, setShowTopCandidates] = useState(false);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      alert('Only PDF files are supported. Some files were filtered out.');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== droppedFiles.length) {
      alert('Only PDF files are supported. Some files were filtered out.');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearAllFiles = () => {
    setFiles([]);
    setResults([]);
    setAnalysisProgress(0);
    setCurrentlyProcessing('');
  };

  // Start analysis
  const startAnalysis = async () => {
    if (files.length === 0 || !jobDescription.title || !jobDescription.description) {
      alert('Please upload files and provide job description details.');
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setAnalysisProgress(0);
    setActiveTab('results');

    try {
      const analysisResults = await analyzeBulkCVs(
        files,
        jobDescription,
        (progress, fileName) => {
          setAnalysisProgress(progress);
          setCurrentlyProcessing(fileName || '');
        }
      );

      setResults(analysisResults);
      setCurrentlyProcessing('');
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const csvData = exportResultsToCSV(results);
    downloadCSV(csvData, 'cv-analysis-results.csv');
  };

  const exportDetailedReport = () => {
    const report = exportDetailedSummaries(results, jobDescription);
    downloadTextFile(report, 'detailed-analysis-report.txt');
  };

  // Filter and sort results
  const filteredAndSortedResults = results
    .filter(result => 
      result.matchScore >= filterScore &&
      (result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       result.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
       result.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = a.matchScore - b.matchScore;
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get analysis statistics
  const stats = getAnalysisStats(results);
  const topCandidates = getTopCandidates(results, 5);

  // Render file upload area
  const renderUploadArea = () => (
    <div className="space-y-8">
      {/* Job Description Section */}
      <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="w-5 h-5" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Job Title (e.g., Senior Software Engineer)"
            value={jobDescription.title}
            onChange={(e) => setJobDescription(prev => ({ ...prev, title: e.target.value }))}
            className="border-blue-200 focus:border-blue-400"
          />
          <TextArea
            placeholder="Detailed job description..."
            value={jobDescription.description}
            onChange={(e) => setJobDescription(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="border-blue-200 focus:border-blue-400"
          />
          <TextArea
            placeholder="Key requirements and qualifications..."
            value={jobDescription.requirements}
            onChange={(e) => setJobDescription(prev => ({ ...prev, requirements: e.target.value }))}
            rows={3}
            className="border-blue-200 focus:border-blue-400"
          />
          <Input
            placeholder="Keywords (comma-separated: React, TypeScript, Node.js)"
            value={jobDescription.keywords.join(', ')}
            onChange={(e) => setJobDescription(prev => ({ 
              ...prev, 
              keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
            }))}
            className="border-blue-200 focus:border-blue-400"
          />
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card className="border-2 border-dashed border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Upload className="w-5 h-5" />
            Upload CV Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-green-800 mb-2">
              Drop PDF files here or click to browse
            </p>
            <p className="text-green-600">
              Supports multiple PDF files up to 10MB each
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-green-900">
                  Selected Files ({files.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded border border-green-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-green-600">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        {files.length > 0 && jobDescription.title && jobDescription.description && (
          <CardFooter>
            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing CVs...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Start Analysis ({files.length} files)
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );

  // Render results section
  const renderResults = () => (
    <div className="space-y-6">
      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">
                  Analyzing CVs...
                </span>
                <span className="text-blue-700">
                  {Math.round(analysisProgress)}%
                </span>
              </div>
              
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              
              {currentlyProcessing && (
                <p className="text-sm text-blue-700">
                  Processing: {currentlyProcessing}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Controls */}
      {results.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search results..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    placeholder="Min score"
                    value={filterScore}
                    onChange={(e) => setFilterScore(Number(e.target.value))}
                    className="w-24"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    setSortOrder(newOrder);
                  }}
                >
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  {sortBy} ({sortOrder})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportDetailedReport}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Detailed Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filteredAndSortedResults.map((result, index) => (
            <motion.div
              key={result.fileName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`cursor-pointer transition-all hover:shadow-lg ${
                result.status === 'error' ? 'border-red-200 bg-red-50' : 
                result.matchScore >= 80 ? 'border-green-200 bg-green-50' :
                result.matchScore >= 60 ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {result.fileName}
                        </h3>
                        
                        {result.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.matchScore >= 80 ? 'bg-green-100 text-green-800' :
                              result.matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.matchScore}% match
                            </div>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600">Error</span>
                          </div>
                        )}
                      </div>
                      
                      {result.status === 'completed' ? (
                        <>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {result.summary}
                          </p>
                          
                          <div className="flex flex-wrap gap-1">
                            {result.tags.slice(0, 5).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {result.tags.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{result.tags.length - 5} more
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-red-600">
                          {result.error || 'Analysis failed'}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedResult(result)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAndSortedResults.length === 0 && results.length > 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileX className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              No results match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render insights section
  const renderInsights = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Files</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalFiles}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Processed</p>
                <p className="text-2xl font-bold text-green-900">{stats.processedFiles}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Score</p>
                <p className="text-2xl font-bold text-purple-900">{stats.averageScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Top Score</p>
                <p className="text-2xl font-bold text-orange-900">{stats.topScore}%</p>
              </div>
              <Award className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Candidates */}
      {topCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Top Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCandidates.map((candidate, index) => (
                <div
                  key={candidate.fileName}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-yellow-500 text-white rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {candidate.fileName}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {candidate.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-700">
                        {candidate.matchScore}%
                      </div>
                      <div className="text-xs text-yellow-600">match</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedResult(candidate)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <FloatingPaths />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <AnimatedTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Bulk CV Analysis
            </AnimatedTitle>
            <AnimatedSubtitle className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload multiple CVs and analyze them against your job requirements using AI-powered matching
            </AnimatedSubtitle>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border">
              {[
                { id: 'upload', label: 'Upload & Setup', icon: Upload },
                { id: 'results', label: 'Results', icon: FileText },
                { id: 'insights', label: 'Insights', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                    activeTab === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {id === 'results' && results.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {results.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {activeTab === 'upload' && renderUploadArea()}
            {activeTab === 'results' && renderResults()}
            {activeTab === 'insights' && renderInsights()}
          </div>
        </div>
      </main>

      {/* Result Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedResult.fileName}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedResult(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedResult.status === 'completed' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedResult.matchScore >= 80 ? 'bg-green-100 text-green-800' :
                      selectedResult.matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedResult.matchScore}% match
                    </div>
                    {selectedResult.extractedTextLength && (
                      <span className="text-sm text-gray-600">
                        {selectedResult.extractedTextLength} characters extracted
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedResult.summary}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <h4 className="font-semibold text-red-900 mb-2">Analysis Failed</h4>
                  <p className="text-red-700">
                    {selectedResult.error || 'An error occurred during analysis'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BulkAnalysisPage;