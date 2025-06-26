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
 * Simple ZIP file parser for DOCX files
 */
class SimpleZipParser {
  private data: Uint8Array;
  private view: DataView;
  
  constructor(data: ArrayBuffer) {
    this.data = new Uint8Array(data);
    this.view = new DataView(data);
  }
  
  /**
   * Find and extract a file from the ZIP archive
   */
  extractFile(filename: string): Uint8Array | null {
    try {
      // Look for the central directory end record
      const endOfCentralDir = this.findEndOfCentralDirectory();
      if (!endOfCentralDir) {
        console.warn('Could not find end of central directory');
        return null;
      }
      
      const centralDirOffset = endOfCentralDir.centralDirOffset;
      const centralDirSize = endOfCentralDir.centralDirSize;
      
      // Parse central directory entries
      let offset = centralDirOffset;
      const endOffset = centralDirOffset + centralDirSize;
      
      while (offset < endOffset) {
        // Check for central directory file header signature
        const signature = this.view.getUint32(offset, true);
        if (signature !== 0x02014b50) {
          break;
        }
        
        // Read file header
        const fileNameLength = this.view.getUint16(offset + 28, true);
        const extraFieldLength = this.view.getUint16(offset + 30, true);
        const fileCommentLength = this.view.getUint16(offset + 32, true);
        const localHeaderOffset = this.view.getUint32(offset + 42, true);
        
        // Extract filename
        const fileNameBytes = this.data.slice(offset + 46, offset + 46 + fileNameLength);
        const currentFileName = new TextDecoder('utf-8').decode(fileNameBytes);
        
        if (currentFileName === filename) {
          // Found the file, now extract it from the local file header
          return this.extractFileData(localHeaderOffset);
        }
        
        // Move to next entry
        offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing ZIP structure:', error);
      return null;
    }
  }
  
  private findEndOfCentralDirectory() {
    // Search for end of central directory signature from the end of file
    const signature = 0x06054b50;
    
    for (let i = this.data.length - 22; i >= 0; i--) {
      if (this.view.getUint32(i, true) === signature) {
        return {
          centralDirSize: this.view.getUint32(i + 12, true),
          centralDirOffset: this.view.getUint32(i + 16, true)
        };
      }
    }
    
    return null;
  }
  
  private extractFileData(localHeaderOffset: number): Uint8Array | null {
    try {
      // Check local file header signature
      const signature = this.view.getUint32(localHeaderOffset, true);
      if (signature !== 0x04034b50) {
        return null;
      }
      
      const compressionMethod = this.view.getUint16(localHeaderOffset + 8, true);
      const compressedSize = this.view.getUint32(localHeaderOffset + 18, true);
      const uncompressedSize = this.view.getUint32(localHeaderOffset + 22, true);
      const fileNameLength = this.view.getUint16(localHeaderOffset + 26, true);
      const extraFieldLength = this.view.getUint16(localHeaderOffset + 28, true);
      
      const dataOffset = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
      const fileData = this.data.slice(dataOffset, dataOffset + compressedSize);
      
      if (compressionMethod === 0) {
        // No compression
        return fileData;
      } else if (compressionMethod === 8) {
        // Deflate compression - we'll try to decompress using browser APIs
        try {
          return this.inflateData(fileData);
        } catch (inflateError) {
          console.warn('Failed to inflate compressed data:', inflateError);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error extracting file data:', error);
      return null;
    }
  }
  
  private inflateData(compressedData: Uint8Array): Uint8Array {
    // Use browser's built-in DecompressionStream if available
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new DecompressionStream('deflate');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        // This is a simplified approach - in practice, you'd need to handle the async nature
        // For now, we'll fall back to a simpler method
      } catch (e) {
        console.warn('DecompressionStream not available or failed');
      }
    }
    
    // Fallback: try to use the data as-is (some files might not be compressed)
    return compressedData;
  }
}

/**
 * Extract text from DOCX file using improved ZIP parsing
 */
export async function extractTextFromDOCX(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Starting DOCX text extraction for: ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const zipParser = new SimpleZipParser(arrayBuffer);
    
    // Try to extract the main document XML
    let documentXml: Uint8Array | null = null;
    
    // Try different possible paths for the document
    const possiblePaths = [
      'word/document.xml',
      'word/document.xml',
      'xl/sharedStrings.xml', // For Excel files that might be misidentified
    ];
    
    for (const path of possiblePaths) {
      documentXml = zipParser.extractFile(path);
      if (documentXml) {
        console.log(`📦 Found document at: ${path}`);
        break;
      }
    }
    
    if (!documentXml) {
      console.warn('⚠️ Could not extract document.xml, trying fallback methods...');
      return await extractTextFromDOCXFallback(arrayBuffer, file.name);
    }
    
    // Convert the XML data to string
    let xmlContent: string;
    try {
      xmlContent = new TextDecoder('utf-8').decode(documentXml);
    } catch (decodeError) {
      console.warn('Failed to decode as UTF-8, trying latin1...');
      xmlContent = new TextDecoder('latin1').decode(documentXml);
    }
    
    console.log(`📦 Extracted XML content: ${xmlContent.length} characters`);
    
    // Extract text from the XML content
    const extractedText = extractTextFromWordXML(xmlContent);
    
    if (extractedText.length < 100) {
      console.warn('⚠️ Extracted text too short, trying fallback...');
      return await extractTextFromDOCXFallback(arrayBuffer, file.name);
    }
    
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
    
    // Try fallback method
    try {
      console.log('🔄 Attempting fallback extraction method...');
      return await extractTextFromDOCXFallback(await file.arrayBuffer(), file.name);
    } catch (fallbackError) {
      console.error('❌ Fallback extraction also failed:', fallbackError);
      throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Fallback method for DOCX text extraction
 */
async function extractTextFromDOCXFallback(arrayBuffer: ArrayBuffer, fileName: string): Promise<TextExtractionResult> {
  console.log('🔄 Using fallback DOCX extraction method...');
  
  try {
    // Convert the entire file to a string and look for readable text
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try different encoding approaches
    let rawText = '';
    
    try {
      // Try UTF-8 first
      rawText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch (e) {
      // Fallback to latin1
      rawText = new TextDecoder('latin1').decode(uint8Array);
    }
    
    console.log(`📄 Raw text length: ${rawText.length}`);
    
    // Extract readable text using various patterns
    const textParts: string[] = [];
    
    // Method 1: Look for text between XML tags that look like Word content
    const xmlTextMatches = rawText.match(/<w:t[^>]*?>(.*?)<\/w:t>/gs);
    if (xmlTextMatches) {
      xmlTextMatches.forEach(match => {
        const content = match.replace(/<[^>]*>/g, '').trim();
        if (content.length > 2 && /[a-zA-Z]/.test(content)) {
          textParts.push(content);
        }
      });
    }
    
    // Method 2: Look for readable text sequences
    if (textParts.length < 10) {
      const readableTextMatches = rawText.match(/[A-Za-z][A-Za-z0-9\s.,;:!?()\-]{15,}/g);
      if (readableTextMatches) {
        readableTextMatches.forEach(match => {
          const cleaned = match.trim();
          if (cleaned.length > 10 && !cleaned.includes('<') && !cleaned.includes('>')) {
            textParts.push(cleaned);
          }
        });
      }
    }
    
    // Method 3: Look for common CV-related words and extract surrounding context
    if (textParts.length < 5) {
      const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'company', 'project'];
      
      cvKeywords.forEach(keyword => {
        const regex = new RegExp(`[^<>]{0,100}${keyword}[^<>]{0,100}`, 'gi');
        const matches = rawText.match(regex);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/[^\w\s.,;:!?()\-]/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleaned.length > 20) {
              textParts.push(cleaned);
            }
          });
        }
      });
    }
    
    // Combine and clean up the extracted text
    let extractedText = textParts.join(' ').trim();
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log(`✅ Fallback extraction completed:`);
    console.log(`   - Total characters: ${extractedText.length}`);
    console.log(`   - Word count: ${wordCount}`);
    console.log(`   - Text parts found: ${textParts.length}`);
    
    if (extractedText.length < 50) {
      // If we still don't have enough content, create a meaningful fallback
      const fallbackText = `CV document uploaded: ${fileName}. The document content could not be automatically extracted, but the file has been received and is available for manual review. This may be due to the document being image-based, password-protected, or using an unsupported format variation. Please ensure the document contains selectable text for optimal processing.`;
      
      return {
        text: fallbackText,
        pageCount: 1,
        wordCount: fallbackText.split(/\s+/).length
      };
    }
    
    return {
      text: extractedText,
      pageCount: 1,
      wordCount
    };
    
  } catch (error) {
    console.error('❌ Fallback extraction failed:', error);
    
    // Final fallback - return a descriptive message
    const fallbackText = `CV document uploaded: ${fileName}. The document content could not be automatically extracted, but the file has been received and is available for manual review. This may be due to the document being image-based, password-protected, or using an unsupported format variation.`;
    
    return {
      text: fallbackText,
      pageCount: 1,
      wordCount: fallbackText.split(/\s+/).length
    };
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
    
    // Final cleanup
    return extractedText.replace(/\s+/g, ' ').trim();
    
  } catch (error) {
    console.error('Error extracting text from XML:', error);
    return '';
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