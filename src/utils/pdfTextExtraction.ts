import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker - use Vite's URL import instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  wordCount: number;
}

/**
 * Extract text from PDF file using PDF.js
 */
export async function extractTextFromPDF(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Starting PDF text extraction for: ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`📖 PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    let fullText = '';
    const textParts: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.trim().length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          textParts.push(pageText.trim());
        }
        
        console.log(`📄 Page ${pageNum}: extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`⚠️ Failed to extract text from page ${pageNum}:`, pageError);
      }
    }
    
    // Combine all pages
    fullText = textParts.join('\n\n').trim();
    
    // Clean up the text
    fullText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log(`✅ PDF text extraction completed:`);
    console.log(`   - Total characters: ${fullText.length}`);
    console.log(`   - Word count: ${wordCount}`);
    console.log(`   - Pages processed: ${pdf.numPages}`);
    
    if (fullText.length < 100) {
      throw new Error('Extracted text is too short. The PDF might be image-based or corrupted.');
    }
    
    return {
      text: fullText,
      pageCount: pdf.numPages,
      wordCount
    };
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from DOCX file using JSZip-like approach
 */
export async function extractTextFromDOCX(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Starting DOCX text extraction for: ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    
    // DOCX files are ZIP archives, so we need to extract the document.xml
    const zipData = new Uint8Array(arrayBuffer);
    
    // Find the document.xml file in the ZIP structure
    let documentXml = '';
    
    try {
      // Convert to string to search for ZIP file structure
      const zipString = new TextDecoder('latin1').decode(zipData);
      
      // Look for document.xml content
      const docXmlStart = zipString.indexOf('word/document.xml');
      if (docXmlStart !== -1) {
        // Find the actual XML content after the ZIP header
        const xmlContentStart = zipString.indexOf('<?xml', docXmlStart);
        if (xmlContentStart !== -1) {
          const xmlContentEnd = zipString.indexOf('</w:document>', xmlContentStart);
          if (xmlContentEnd !== -1) {
            documentXml = zipString.substring(xmlContentStart, xmlContentEnd + 13);
          }
        }
      }
      
      // If we didn't find it that way, try a different approach
      if (!documentXml) {
        // Look for any XML content that looks like Word document structure
        const xmlMatches = zipString.match(/<w:document[^>]*>.*?<\/w:document>/gs);
        if (xmlMatches && xmlMatches.length > 0) {
          documentXml = xmlMatches[0];
        }
      }
      
      // If still no luck, try to find any w:t elements directly
      if (!documentXml) {
        const textMatches = zipString.match(/<w:t[^>]*>.*?<\/w:t>/gs);
        if (textMatches && textMatches.length > 0) {
          documentXml = textMatches.join(' ');
        }
      }
      
    } catch (zipError) {
      console.warn('⚠️ ZIP parsing approach failed, trying direct text extraction');
      
      // Fallback: try to extract any readable text from the binary data
      const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
      const rawText = decoder.decode(zipData);
      
      // Look for any text that looks like it could be from a Word document
      const textMatches = rawText.match(/[A-Za-z][A-Za-z0-9\s.,;:!?()-]{20,}/g);
      if (textMatches) {
        documentXml = textMatches.join(' ');
      }
    }
    
    console.log(`📦 Found document content: ${documentXml.length} characters`);
    
    if (!documentXml) {
      throw new Error('Could not locate document content in DOCX file');
    }
    
    // Extract text from the XML content
    let extractedText = '';
    const textParts: string[] = [];
    
    // Method 1: Extract from w:t elements (Word text elements)
    const textElementRegex = /<w:t[^>]*?>(.*?)<\/w:t>/gs;
    let match;
    
    while ((match = textElementRegex.exec(documentXml)) !== null) {
      let textContent = match[1];
      
      // Decode XML entities
      textContent = textContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      
      if (textContent.trim().length > 0) {
        textParts.push(textContent.trim());
      }
    }
    
    console.log(`📝 Extracted ${textParts.length} text elements from w:t tags`);
    
    // Method 2: If not enough content, try extracting from paragraph structure
    if (textParts.length < 5) {
      console.log('🔄 Trying paragraph extraction...');
      
      const paragraphRegex = /<w:p[^>]*?>(.*?)<\/w:p>/gs;
      const paragraphParts: string[] = [];
      
      while ((match = paragraphRegex.exec(documentXml)) !== null) {
        const paraContent = match[1];
        
        // Remove XML tags and extract text
        const cleanContent = paraContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanContent.length > 3 && /[a-zA-Z]/.test(cleanContent)) {
          paragraphParts.push(cleanContent);
        }
      }
      
      if (paragraphParts.length > textParts.length) {
        textParts.length = 0;
        textParts.push(...paragraphParts);
      }
    }
    
    // Method 3: If still not enough, extract any readable text
    if (textParts.length < 3) {
      console.log('🔄 Trying general text extraction...');
      
      // Remove all XML tags and extract readable text
      const cleanText = documentXml
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/[^\x20-\x7E\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const words = cleanText.split(' ').filter(word => 
        word.length > 2 && /[a-zA-Z]/.test(word)
      );
      
      if (words.length > 10) {
        textParts.length = 0;
        textParts.push(words.join(' '));
      }
    }
    
    // Combine all text parts
    extractedText = textParts.join(' ').trim();
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log(`✅ DOCX text extraction completed:`);
    console.log(`   - Total characters: ${extractedText.length}`);
    console.log(`   - Word count: ${wordCount}`);
    console.log(`   - Text parts: ${textParts.length}`);
    console.log(`   - Preview: ${extractedText.substring(0, 300)}...`);
    
    // Apply the same validation as PDF - throw error if insufficient content
    if (extractedText.length < 100) {
      throw new Error('Extracted text is too short. The DOCX might be image-based, corrupted, or password-protected.');
    }
    
    return {
      text: extractedText,
      pageCount: 1,
      wordCount
    };
    
  } catch (error) {
    console.error('❌ DOCX text extraction failed:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  console.log(`🔍 Detecting file type: ${fileType} for file: ${file.name}`);
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return await extractTextFromDOCX(file);
  } else if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    // Handle plain text files
    const text = await file.text();
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    return {
      text: text.trim(),
      pageCount: 1,
      wordCount
    };
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Please upload PDF, DOCX, or TXT files.`);
  }
}

/**
 * Validate extracted text quality
 */
export function validateExtractedText(text: string, filename: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (text.length < 50) {
    issues.push('Text too short (less than 50 characters)');
  }
  
  if (text.length < 200) {
    issues.push('Text may be incomplete (less than 200 characters)');
  }
  
  // Check for meaningful content
  const wordCount = text.split(/\s+/).filter(word => word.length > 2).length;
  if (wordCount < 20) {
    issues.push('Too few meaningful words found');
  }
  
  // Check for common CV keywords
  const cvKeywords = [
    'experience', 'education', 'skills', 'work', 'job', 'company', 'university', 
    'degree', 'project', 'development', 'management', 'team', 'years'
  ];
  
  const foundKeywords = cvKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  ).length;
  
  if (foundKeywords < 3) {
    issues.push('Text may not be a typical CV (few CV-related keywords found)');
  }
  
  // Check for too much repetitive content
  const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
  const repetitionRatio = uniqueWords.size / wordCount;
  
  if (repetitionRatio < 0.3) {
    issues.push('Text appears highly repetitive');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}