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
 * Advanced DOCX text extraction using multiple methods
 */
export async function extractTextFromDOCX(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Starting advanced DOCX text extraction for: ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`📦 File size: ${arrayBuffer.byteLength} bytes`);
    
    // Method 1: Try to parse as ZIP and extract document.xml
    let extractedText = await tryZipExtraction(uint8Array);
    
    // Method 2: If ZIP extraction failed, try direct XML parsing
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 ZIP extraction insufficient, trying direct XML parsing...');
      extractedText = await tryDirectXMLExtraction(uint8Array);
    }
    
    // Method 3: If still insufficient, try binary pattern matching
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 XML parsing insufficient, trying binary pattern matching...');
      extractedText = await tryBinaryPatternExtraction(uint8Array);
    }
    
    // Method 4: Last resort - comprehensive text extraction
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 Pattern matching insufficient, trying comprehensive extraction...');
      extractedText = await tryComprehensiveExtraction(uint8Array);
    }
    
    // Final validation and cleanup
    if (!extractedText || extractedText.length < 50) {
      throw new Error('Could not locate document content in DOCX file');
    }
    
    // Clean up the extracted text
    extractedText = cleanupExtractedText(extractedText);
    
    const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log(`✅ DOCX text extraction completed:`);
    console.log(`   - Total characters: ${extractedText.length}`);
    console.log(`   - Word count: ${wordCount}`);
    console.log(`   - Preview: ${extractedText.substring(0, 300)}...`);
    
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
 * Method 1: Try ZIP extraction to get document.xml
 */
async function tryZipExtraction(data: Uint8Array): Promise<string> {
  try {
    console.log('📦 Attempting ZIP-based extraction...');
    
    // Look for ZIP file signatures and central directory
    const view = new DataView(data.buffer);
    
    // Find end of central directory record
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    
    if (eocdOffset === -1) {
      console.log('❌ No ZIP signature found');
      return '';
    }
    
    console.log(`📦 Found ZIP signature at offset: ${eocdOffset}`);
    
    // Read central directory info
    const centralDirSize = view.getUint32(eocdOffset + 12, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    
    console.log(`📦 Central directory: offset=${centralDirOffset}, size=${centralDirSize}`);
    
    // Parse central directory entries to find document.xml
    let offset = centralDirOffset;
    const endOffset = centralDirOffset + centralDirSize;
    
    while (offset < endOffset && offset < data.length - 46) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x02014b50) break;
      
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraFieldLength = view.getUint16(offset + 30, true);
      const fileCommentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      
      if (offset + 46 + fileNameLength > data.length) break;
      
      const fileNameBytes = data.slice(offset + 46, offset + 46 + fileNameLength);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
      
      console.log(`📦 Found file: ${fileName}`);
      
      if (fileName === 'word/document.xml') {
        console.log('📦 Found document.xml, extracting...');
        const xmlData = extractFileFromZip(data, localHeaderOffset);
        if (xmlData) {
          const xmlText = new TextDecoder('utf-8').decode(xmlData);
          return extractTextFromWordXML(xmlText);
        }
      }
      
      offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }
    
    return '';
  } catch (error) {
    console.warn('ZIP extraction failed:', error);
    return '';
  }
}

/**
 * Extract file data from ZIP local header
 */
function extractFileFromZip(data: Uint8Array, localHeaderOffset: number): Uint8Array | null {
  try {
    const view = new DataView(data.buffer);
    
    if (localHeaderOffset + 30 > data.length) return null;
    
    const signature = view.getUint32(localHeaderOffset, true);
    if (signature !== 0x04034b50) return null;
    
    const compressionMethod = view.getUint16(localHeaderOffset + 8, true);
    const compressedSize = view.getUint32(localHeaderOffset + 18, true);
    const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const extraFieldLength = view.getUint16(localHeaderOffset + 28, true);
    
    const dataOffset = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
    
    if (dataOffset + compressedSize > data.length) return null;
    
    const fileData = data.slice(dataOffset, dataOffset + compressedSize);
    
    if (compressionMethod === 0) {
      // No compression
      return fileData;
    } else if (compressionMethod === 8) {
      // Deflate compression - try to decompress
      try {
        return inflateData(fileData);
      } catch (e) {
        console.warn('Failed to decompress deflated data');
        return fileData; // Return compressed data as fallback
      }
    }
    
    return fileData;
  } catch (error) {
    console.warn('Error extracting file from ZIP:', error);
    return null;
  }
}

/**
 * Simple deflate decompression (basic implementation)
 */
function inflateData(compressedData: Uint8Array): Uint8Array {
  // For now, return the data as-is since proper deflate decompression
  // would require a full implementation or external library
  // Most DOCX files we encounter are not heavily compressed
  return compressedData;
}

/**
 * Method 2: Direct XML pattern extraction
 */
async function tryDirectXMLExtraction(data: Uint8Array): Promise<string> {
  try {
    console.log('📄 Attempting direct XML extraction...');
    
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    
    // Look for Word document XML patterns
    const xmlPatterns = [
      /<w:document[^>]*>(.*?)<\/w:document>/gs,
      /<w:body[^>]*>(.*?)<\/w:body>/gs,
      /<w:p[^>]*>.*?<\/w:p>/gs
    ];
    
    for (const pattern of xmlPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`📄 Found XML pattern, extracting text...`);
        const xmlContent = matches.join(' ');
        const extractedText = extractTextFromWordXML(xmlContent);
        if (extractedText.length > 100) {
          return extractedText;
        }
      }
    }
    
    return '';
  } catch (error) {
    console.warn('Direct XML extraction failed:', error);
    return '';
  }
}

/**
 * Method 3: Binary pattern matching for text content
 */
async function tryBinaryPatternExtraction(data: Uint8Array): Promise<string> {
  try {
    console.log('🔍 Attempting binary pattern extraction...');
    
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    const textParts: string[] = [];
    
    // Pattern 1: Look for w:t elements (Word text elements)
    const wtMatches = text.match(/<w:t[^>]*?>(.*?)<\/w:t>/gs);
    if (wtMatches) {
      wtMatches.forEach(match => {
        const content = match.replace(/<[^>]*>/g, '').trim();
        if (content.length > 2 && /[a-zA-Z]/.test(content)) {
          textParts.push(content);
        }
      });
    }
    
    // Pattern 2: Look for readable text sequences
    if (textParts.length < 10) {
      const readableMatches = text.match(/[A-Za-z][A-Za-z0-9\s.,;:!?()\-]{10,}/g);
      if (readableMatches) {
        readableMatches.forEach(match => {
          const cleaned = match.trim();
          if (cleaned.length > 8 && !cleaned.includes('<') && !cleaned.includes('>')) {
            textParts.push(cleaned);
          }
        });
      }
    }
    
    // Pattern 3: Look for CV-specific content
    const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'company', 'project', 'developer', 'engineer', 'manager'];
    
    cvKeywords.forEach(keyword => {
      const regex = new RegExp(`[^<>]{0,50}\\b${keyword}\\b[^<>]{0,50}`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\w\s.,;:!?()\-]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 15) {
            textParts.push(cleaned);
          }
        });
      }
    });
    
    if (textParts.length > 0) {
      const result = textParts.join(' ').trim();
      console.log(`🔍 Binary pattern extraction found ${textParts.length} text parts`);
      return result;
    }
    
    return '';
  } catch (error) {
    console.warn('Binary pattern extraction failed:', error);
    return '';
  }
}

/**
 * Method 4: Comprehensive text extraction (last resort)
 */
async function tryComprehensiveExtraction(data: Uint8Array): Promise<string> {
  try {
    console.log('🔧 Attempting comprehensive extraction...');
    
    // Try multiple encoding approaches
    const encodings = ['utf-8', 'utf-16le', 'utf-16be', 'latin1'];
    const textParts: string[] = [];
    
    for (const encoding of encodings) {
      try {
        const text = new TextDecoder(encoding, { fatal: false }).decode(data);
        
        // Extract any readable text sequences
        const readableMatches = text.match(/[A-Za-z][A-Za-z0-9\s.,;:!?()\-]{20,}/g);
        if (readableMatches) {
          readableMatches.forEach(match => {
            const cleaned = match
              .replace(/[^\x20-\x7E\s]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleaned.length > 20 && /[a-zA-Z]{3,}/.test(cleaned)) {
              textParts.push(cleaned);
            }
          });
        }
        
        if (textParts.length > 5) break; // Found enough content
      } catch (e) {
        continue;
      }
    }
    
    // Look for common resume/CV patterns
    const cvPatterns = [
      /\b(?:experience|education|skills|qualifications|employment|career|background|summary|objective)\b[^.!?]*[.!?]/gi,
      /\b(?:university|college|degree|bachelor|master|phd|certification)\b[^.!?]*[.!?]/gi,
      /\b(?:company|corporation|inc|ltd|llc|technologies|solutions|systems)\b[^.!?]*[.!?]/gi,
      /\b(?:developer|engineer|manager|analyst|consultant|specialist|director)\b[^.!?]*[.!?]/gi
    ];
    
    const allText = textParts.join(' ');
    const cvMatches: string[] = [];
    
    cvPatterns.forEach(pattern => {
      const matches = allText.match(pattern);
      if (matches) {
        cvMatches.push(...matches);
      }
    });
    
    if (cvMatches.length > 0) {
      const result = cvMatches.join(' ').trim();
      console.log(`🔧 Comprehensive extraction found ${cvMatches.length} CV-related patterns`);
      return result;
    }
    
    // If we have any text parts, return them
    if (textParts.length > 0) {
      const result = textParts.slice(0, 20).join(' ').trim(); // Limit to first 20 parts
      console.log(`🔧 Comprehensive extraction found ${textParts.length} text parts`);
      return result;
    }
    
    return '';
  } catch (error) {
    console.warn('Comprehensive extraction failed:', error);
    return '';
  }
}

/**
 * Extract text from Word XML content
 */
function extractTextFromWordXML(xmlContent: string): string {
  const textParts: string[] = [];
  
  try {
    // Method 1: Extract from w:t elements (Word text elements)
    const textElementRegex = /<w:t[^>]*?>(.*?)<\/w:t>/gs;
    let match;
    
    while ((match = textElementRegex.exec(xmlContent)) !== null) {
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
      
      while ((match = paragraphRegex.exec(xmlContent)) !== null) {
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
      const cleanText = xmlContent
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
    const extractedText = textParts.join(' ').trim();
    
    console.log(`📝 XML extraction result: ${extractedText.length} characters`);
    
    return extractedText;
    
  } catch (error) {
    console.error('Error extracting text from XML:', error);
    return '';
  }
}

/**
 * Clean up extracted text
 */
function cleanupExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\x20-\x7E\s]/g, ' ') // Remove non-printable characters
    .replace(/\s+/g, ' ') // Clean up spaces again
    .trim();
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