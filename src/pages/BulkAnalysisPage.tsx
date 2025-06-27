import React, { useState, useRef } from 'react';
import { Upload, FileText, BarChart3, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/button';

interface AnalysisJob {
  id: string;
  jobDescriptionId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface CVUpload {
  id: string;
  filename: string;
  originalFilename: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  extractedText?: string;
  analysisScore?: number;
  analysisSummary?: string;
  analysisTags?: string[];
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  errorMessage?: string;
  uploadedAt: string;
  analyzedAt?: string;
}

const BulkAnalysisPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);
  const [results, setResults] = useState<CVUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    setSelectedFiles(pdfFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    setSelectedFiles(pdfFiles);
  };

  const startAnalysis = async () => {
    if (!jobDescription.trim() || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Implementation would go here to:
      // 1. Create job description in database
      // 2. Upload files
      // 3. Start analysis job
      // 4. Poll for results
      
      // Mock implementation for now
      const mockJob: AnalysisJob = {
        id: 'mock-job-id',
        jobDescriptionId: 'mock-desc-id',
        totalFiles: selectedFiles.length,
        processedFiles: 0,
        failedFiles: 0,
        status: 'processing',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      setAnalysisJob(mockJob);
    } catch (error) {
      console.error('Error starting analysis:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Bulk CV Analysis
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload multiple CVs and analyze them against your job description using AI-powered matching
            </p>
          </div>

          {/* Job Description Input */}
          <Card className="mb-8 p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-600" />
              Job Description
            </h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Enter the job description that CVs will be analyzed against..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isUploading || analysisJob?.status === 'processing'}
            />
          </Card>

          {/* File Upload */}
          <Card className="mb-8 p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-blue-600" />
              Upload CVs
            </h2>
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Drag and drop PDF files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Only PDF files are supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || analysisJob?.status === 'processing'}
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">
                  Selected Files ({selectedFiles.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-sm font-medium">{file.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start Analysis Button */}
            <div className="mt-6">
              <Button
                onClick={startAnalysis}
                disabled={!jobDescription.trim() || selectedFiles.length === 0 || isUploading || analysisJob?.status === 'processing'}
                className="w-full py-3 text-lg"
              >
                {isUploading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Start Bulk Analysis
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Analysis Progress */}
          {analysisJob && (
            <Card className="mb-8 p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                {getStatusIcon(analysisJob.status)}
                <span className="ml-2">Analysis Progress</span>
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium capitalize ${
                    analysisJob.status === 'completed' ? 'text-green-600' :
                    analysisJob.status === 'processing' ? 'text-blue-600' :
                    analysisJob.status === 'failed' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {analysisJob.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">
                    {analysisJob.processedFiles} / {analysisJob.totalFiles} files processed
                  </span>
                </div>
                
                {analysisJob.failedFiles > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">
                      {analysisJob.failedFiles} files
                    </span>
                  </div>
                )}
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(analysisJob.processedFiles / analysisJob.totalFiles) * 100}%`
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
                  Analysis Results
                </h2>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
              </div>
              
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-red-500 mr-2" />
                        <span className="font-medium">{result.originalFilename}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        {result.analysisScore && (
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Match Score</div>
                            <div className={`text-lg font-bold ${
                              result.analysisScore >= 80 ? 'text-green-600' :
                              result.analysisScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {result.analysisScore}%
                            </div>
                          </div>
                        )}
                        {getStatusIcon(result.status)}
                      </div>
                    </div>
                    
                    {result.analysisSummary && (
                      <p className="text-gray-600 mb-3">{result.analysisSummary}</p>
                    )}
                    
                    {result.analysisTags && result.analysisTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.analysisTags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {result.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{result.errorMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkAnalysisPage;