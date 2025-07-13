import { extractTextFromFile, validateExtractedText } from './pdfTextExtraction';
import { analyzeWithOpenAI, validateOpenAIApiKey } from './openaiAnalysis';
import { sendBulkAnalysisWebhook } from './makeWebhook';

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

/**
 * Analyze multiple CVs directly with OpenAI (no backend required)
 */
export const analyzeBulkCVs = async (
  jobDescription: string,
  cvFiles: File[],
  onProgress: (progress: number, processed?: number) => void
): Promise<AnalysisResult[]> => {
  try {
    console.log('🚀 Starting bulk CV analysis with direct OpenAI integration');
    console.log(`📄 Processing ${cvFiles.length} CV files`);
    console.log(`📝 Job description: ${jobDescription.substring(0, 100)}...`);
    
    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('🔑 Bulk Analysis - API Key Debug:');
    console.log('  - API Key exists:', !!apiKey);
    console.log('  - API Key length:', apiKey?.length || 0);
    console.log('  - API Key starts with sk-:', apiKey?.startsWith('sk-') || false);
    
    if (!apiKey) {
      throw new Error('❌ OpenAI API key not configured for bulk analysis. Please set VITE_OPENAI_API_KEY in your Netlify environment variables.');
    }
    
    // Validate API key
    const keyValidation = validateOpenAIApiKey(apiKey);
    if (!keyValidation.isValid) {
      throw new Error(`❌ Invalid OpenAI API key for bulk analysis: ${keyValidation.error}`);
    }
    
    // Validate job description
    if (!jobDescription.trim() || jobDescription.trim().length < 100) {
      throw new Error('Job description must be at least 100 characters for accurate analysis');
    }
    
    if (cvFiles.length === 0) {
      throw new Error('No CV files provided for analysis');
    }
    
    if (cvFiles.length > 200) {
      throw new Error('Maximum 200 CV files allowed per analysis');
    }
    
    const results: AnalysisResult[] = [];
    const totalFiles = cvFiles.length;
    
    onProgress(5, 0); // Initial progress
    
    for (let i = 0; i < totalFiles; i++) {
      const file = cvFiles[i];
      const fileName = file.name;
      
      console.log(`\n[${i + 1}/${totalFiles}] Processing: ${fileName}`);
      
      try {
        // Step 1: Extract text from the file
        console.log('📄 Extracting text from file...');
        const extractionResult = await extractTextFromFile(file);
        
        console.log(`✅ Text extraction completed:`);
        console.log(`   - Characters: ${extractionResult.text.length}`);
        console.log(`   - Words: ${extractionResult.wordCount}`);
        console.log(`   - Pages: ${extractionResult.pageCount}`);
        
        // Step 2: Validate extracted text
        const validation = validateExtractedText(extractionResult.text, fileName);
        if (!validation.isValid) {
          console.warn(`⚠️ Text validation issues for ${fileName}:`, validation.issues);
        }
        
        // Step 3: Analyze with OpenAI
        console.log('🤖 Analyzing with OpenAI...');
        const analysisResult = await analyzeWithOpenAI({
          extractedText: extractionResult.text,
          jobDescription,
          filename: fileName,
          apiKey: apiKey
        });
        
        console.log(`✅ Analysis completed for ${fileName}:`);
        console.log(`   - Score: ${analysisResult.score}%`);
        console.log(`   - Tags: ${analysisResult.tags.slice(0, 3).join(', ')}...`);
        console.log(`   - Summary: ${analysisResult.summary.substring(0, 100)}...`);
        
        // Truncate summary to max 350 characters
        const truncatedSummary = truncateSummary(analysisResult.summary, 350);
        
        results.push({
          fileName,
          matchScore: analysisResult.score,
          summary: truncatedSummary,
          tags: analysisResult.tags,
          status: 'completed',
          extractedTextLength: extractionResult.text.length,
          pageCount: extractionResult.pageCount,
          wordCount: extractionResult.wordCount
        });
        
      } catch (error) {
        console.error(`❌ Error processing ${fileName}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        results.push({
          fileName,
          matchScore: 0,
          summary: `Failed to process ${fileName}: ${errorMessage}. This could be due to file corruption, unsupported format, or text extraction issues. Please try re-uploading the file or converting it to a different format.`,
          tags: ['processing_failed', 'error_occurred', 'manual_review_needed'],
          status: 'error',
          error: errorMessage
        });
      }
      
      // Update progress (5% to 95%)
      const progress = 5 + ((i + 1) / totalFiles) * 90;
      onProgress(progress, i + 1);
      
      // Small delay to prevent overwhelming the API
      if (i < totalFiles - 1) {
        console.log('⏱️ Waiting 2 seconds before next file...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    onProgress(100, totalFiles);
    
    // Sort results: successful ones first (by score), then failed ones
    results.sort((a, b) => {
      if (a.status === 'completed' && b.status === 'error') return -1;
      if (a.status === 'error' && b.status === 'completed') return 1;
      if (a.status === 'completed' && b.status === 'completed') {
        return b.matchScore - a.matchScore; // Higher scores first
      }
      return 0; // Keep error order as is
    });
    
    // Log summary
    const successful = results.filter(r => r.status === 'completed');
    const failed = results.filter(r => r.status === 'error');
    
    console.log('\n📊 BULK ANALYSIS SUMMARY:');
    console.log(`   ✅ Successfully analyzed: ${successful.length}`);
    console.log(`   ❌ Failed to process: ${failed.length}`);
    
    if (successful.length > 0) {
      const avgScore = Math.round(successful.reduce((sum, r) => sum + r.matchScore, 0) / successful.length);
      const topScore = Math.max(...successful.map(r => r.matchScore));
      console.log(`   📈 Average score: ${avgScore}%`);
      console.log(`   🏆 Top score: ${topScore}%`);
      console.log(`   🎯 Top candidate: ${successful[0].fileName} (${successful[0].matchScore}%)`);
    }
    
    // Send results to webhook
    try {
      console.log('📤 Sending bulk analysis results to webhook...');
      
      const csvData = exportResultsToCSV(results);
      const topCandidates = getTopCandidates(results, 5);
      const avgScore = successful.length > 0 
        ? Math.round(successful.reduce((sum, r) => sum + r.matchScore, 0) / successful.length)
        : 0;
      
      const webhookData = {
        analysis_id: `bulk_${Date.now()}`,
        job_description: jobDescription.substring(0, 500) + (jobDescription.length > 500 ? '...' : ''),
        total_cvs: results.length,
        successful_analyses: successful.length,
        failed_analyses: failed.length,
        average_score: avgScore,
        top_candidates: topCandidates.map(candidate => ({
          filename: candidate.fileName,
          score: candidate.matchScore,
          summary: candidate.summary.substring(0, 200) + (candidate.summary.length > 200 ? '...' : ''),
          tags: candidate.tags
        })),
        csv_data: csvData,
        analysis_timestamp: new Date().toISOString()
      };
      
      const webhookSuccess = await sendBulkAnalysisWebhook(webhookData);
      
      if (webhookSuccess) {
        console.log('✅ Bulk analysis results sent to webhook successfully');
      } else {
        console.warn('⚠️ Failed to send bulk analysis results to webhook');
      }
    } catch (webhookError) {
      console.error('❌ Error sending webhook:', webhookError);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Bulk analysis failed:', error);
    throw error;
  }
};

/**
 * Truncate summary to specified length
 */
function truncateSummary(summary: string, maxLength: number): string {
  if (summary.length <= maxLength) return summary;
  
  // Find the last complete sentence within the limit
  const truncated = summary.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > maxLength * 0.7) {
    // If we found a sentence end that's not too early, use it
    return truncated.substring(0, lastSentenceEnd + 1);
  } else {
    // Otherwise, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    } else {
      return truncated + '...';
    }
  }
}

/**
 * Export results to CSV format
 */
export const exportResultsToCSV = (results: AnalysisResult[]): string => {
  const headers = [
    'File Name', 
    'Match Score', 
    'Summary', 
    'Tags', 
    'Status',
    'Text Length',
    'Word Count',
    'Page Count',
    'Error'
  ];
  
  const csvContent = [
    headers.join(','),
    ...results.map(result => [
      `"${result.fileName}"`,
      result.matchScore,
      `"${result.summary.replace(/"/g, '""')}"`,
      `"${result.tags.join(', ')}"`,
      result.status,
      result.extractedTextLength || 0,
      result.wordCount || 0,
      result.pageCount || 0,
      `"${result.error || ''}"`
    ].join(','))
  ].join('\n');
  
  return csvContent;
};

/**
 * Export detailed summaries to text format
 */
export const exportDetailedSummaries = (results: AnalysisResult[]): string => {
  const content = results.map((result, index) => {
    const sections = [
      `${index + 1}. ${result.fileName}`,
      `${'='.repeat(50)}`,
      `Status: ${result.status.toUpperCase()}`,
      `Match Score: ${result.matchScore}%`,
      '',
      'AI-Generated Tags:',
      result.tags.map(tag => `  • ${tag}`).join('\n'),
      '',
      'Detailed Analysis Summary (Max 350 chars):',
      result.summary,
      ''
    ];
    
    if (result.extractedTextLength) {
      sections.splice(4, 0, `Extracted Text: ${result.extractedTextLength} characters, ${result.wordCount} words, ${result.pageCount} pages`);
    }
    
    if (result.error) {
      sections.splice(-1, 0, 'Error Details:', result.error, '');
    }
    
    return sections.join('\n');
  }).join('\n' + '='.repeat(80) + '\n\n');
  
  const header = [
    'CV ANALYSIS RESULTS - DETAILED REPORT',
    '='.repeat(80),
    `Generated: ${new Date().toLocaleString()}`,
    `Total CVs Analyzed: ${results.length}`,
    `Successful: ${results.filter(r => r.status === 'completed').length}`,
    `Failed: ${results.filter(r => r.status === 'error').length}`,
    '',
    '='.repeat(80),
    ''
  ].join('\n');
  
  return header + content;
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string = 'cv_analysis_results.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download text file
 */
export const downloadTextFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get analysis statistics
 */
export const getAnalysisStats = (results: AnalysisResult[]) => {
  const total = results.length;
  const completed = results.filter(r => r.status === 'completed').length;
  const failed = results.filter(r => r.status === 'error').length;
  const avgScore = completed > 0 
    ? Math.round(results.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.matchScore, 0) / completed)
    : 0;
  
  const scoreRanges = {
    excellent: results.filter(r => r.status === 'completed' && r.matchScore >= 80).length,
    good: results.filter(r => r.status === 'completed' && r.matchScore >= 60 && r.matchScore < 80).length,
    moderate: results.filter(r => r.status === 'completed' && r.matchScore >= 40 && r.matchScore < 60).length,
    poor: results.filter(r => r.status === 'completed' && r.matchScore < 40).length
  };
  
  return { 
    total, 
    completed, 
    failed, 
    avgScore,
    scoreRanges
  };
};

/**
 * Filter results by score range
 */
export const filterResultsByScore = (results: AnalysisResult[], minScore: number, maxScore: number = 100): AnalysisResult[] => {
  return results.filter(result => 
    result.status === 'completed' && 
    result.matchScore >= minScore && 
    result.matchScore <= maxScore
  );
};

/**
 * Get top candidates
 */
export const getTopCandidates = (results: AnalysisResult[], count: number = 10): AnalysisResult[] => {
  return results
    .filter(r => r.status === 'completed')
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, count);
};