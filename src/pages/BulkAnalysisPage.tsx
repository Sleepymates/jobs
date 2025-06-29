import React, { useState, useRef } from 'react';
import { Upload, FileText, BarChart3, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface AnalysisResult {
  id: string;
  filename: string;
  score: number;
  summary: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

const BulkAnalysisPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0 || !jobDescription.trim()) return;

    setIsAnalyzing(true);
    const initialResults: AnalysisResult[] = files.map((file, index) => ({
      id: `file-${index}`,
      filename: file.name,
      score: 0,
      summary: '',
      status: 'pending'
    }));
    setResults(initialResults);

    // Simulate analysis process
    for (let i = 0; i < files.length; i++) {
      setResults(prev => prev.map((result, index) => 
        index === i ? { ...result, status: 'analyzing' } : result
      ));

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate analysis completion
      setResults(prev => prev.map((result, index) => 
        index === i ? {
          ...result,
          status: 'completed',
          score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
          summary: `Strong candidate with relevant experience in ${jobDescription.split(' ').slice(0, 3).join(', ')}. Good technical skills and communication abilities.`
        } : result
      ));
    }

    setIsAnalyzing(false);
  };

  const exportResults = () => {
    const csvContent = [
      ['Filename', 'Score', 'Summary'],
      ...results.map(result => [result.filename, result.score.toString(), result.summary])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cv-analysis-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: AnalysisResult['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      case 'analyzing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Bulk CV Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              Upload multiple CVs and analyze them against your job description
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description to analyze CVs against..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CVs
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload CV files</p>
                <p className="text-sm text-gray-500">PDF, DOC, DOCX files supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Uploaded Files ({files.length})
                </h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Button */}
            <div className="flex justify-between items-center">
              <button
                onClick={startAnalysis}
                disabled={files.length === 0 || !jobDescription.trim() || isAnalyzing}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
              </button>

              {results.length > 0 && (
                <button
                  onClick={exportResults}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Results
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
                <div className="space-y-3">
                  {results.map((result) => (
                    <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium text-gray-900">{result.filename}</span>
                        </div>
                        {result.status === 'completed' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Score:</span>
                            <span className={`font-bold ${
                              result.score >= 80 ? 'text-green-600' :
                              result.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {result.score}/100
                            </span>
                          </div>
                        )}
                      </div>
                      {result.status === 'completed' && result.summary && (
                        <p className="text-sm text-gray-600">{result.summary}</p>
                      )}
                      {result.status === 'analyzing' && (
                        <p className="text-sm text-blue-600">Analyzing CV content...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAnalysisPage;