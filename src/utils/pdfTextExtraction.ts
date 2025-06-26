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
 * Extract text from DOCX file using multiple methods
 */
export async function extractTextFromDOCX(file: File): Promise<TextExtractionResult> {
  try {
    console.log(`📄 Starting DOCX text extraction for: ${file.name}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Method 1: Try to extract as ZIP and find document.xml
    let extractedText = await tryZipExtraction(uint8Array);
    
    // Method 2: If ZIP extraction fails, try direct text extraction
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 ZIP extraction insufficient, trying direct text extraction...');
      extractedText = await tryDirectTextExtraction(uint8Array);
    }
    
    // Method 3: If still no good content, try binary text search
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 Direct extraction insufficient, trying binary text search...');
      extractedText = await tryBinaryTextSearch(uint8Array);
    }
    
    // Method 4: Last resort - enhanced pattern matching
    if (!extractedText || extractedText.length < 100) {
      console.log('🔄 Binary search insufficient, trying enhanced pattern matching...');
      extractedText = await tryEnhancedPatternMatching(uint8Array);
    }
    
    // If we still don't have good content, throw an error instead of using fallback
    if (!extractedText || extractedText.length < 50) {
      throw new Error('Could not extract meaningful text from DOCX file. The file may be corrupted, password-protected, or contain only images.');
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
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Method 1: Try to extract document.xml from ZIP structure
 */
async function tryZipExtraction(uint8Array: Uint8Array): Promise<string | null> {
  try {
    console.log('📦 Attempting ZIP extraction...');
    
    // Look for ZIP file signature
    const view = new DataView(uint8Array.buffer);
    if (view.getUint32(0, true) !== 0x04034b50) {
      console.log('❌ Not a valid ZIP file');
      return null;
    }
    
    // Convert to text to search for XML content
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const fullText = decoder.decode(uint8Array);
    
    // Look for document.xml content
    const documentXmlMatch = fullText.match(/<w:document[^>]*>[\s\S]*?<\/w:document>/);
    if (documentXmlMatch) {
      console.log('✅ Found document.xml content');
      return extractTextFromXML(documentXmlMatch[0]);
    }
    
    console.log('❌ Could not find document.xml in ZIP');
    return null;
  } catch (error) {
    console.error('❌ ZIP extraction failed:', error);
    return null;
  }
}

/**
 * Method 2: Direct text extraction from binary data
 */
async function tryDirectTextExtraction(uint8Array: Uint8Array): Promise<string | null> {
  try {
    console.log('📝 Attempting direct text extraction...');
    
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const text = decoder.decode(uint8Array);
    
    // Look for w:t elements directly
    const textElements = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textElements && textElements.length > 0) {
      console.log(`✅ Found ${textElements.length} text elements`);
      
      const extractedTexts = textElements.map(element => {
        const match = element.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return match ? decodeXmlEntities(match[1]) : '';
      }).filter(text => text.trim().length > 0);
      
      const result = extractedTexts.join(' ').trim();
      console.log(`📝 Direct extraction result: ${result.length} characters`);
      return result.length > 50 ? result : null;
    }
    
    console.log('❌ No text elements found in direct extraction');
    return null;
  } catch (error) {
    console.error('❌ Direct text extraction failed:', error);
    return null;
  }
}

/**
 * Method 3: Binary text search for readable content
 */
async function tryBinaryTextSearch(uint8Array: Uint8Array): Promise<string | null> {
  try {
    console.log('🔍 Attempting binary text search...');
    
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const text = decoder.decode(uint8Array);
    
    // Look for any readable text patterns that might be CV content
    const readableTexts: string[] = [];
    
    // Pattern 1: Look for common CV words followed by readable text
    const cvPatterns = [
      /(?:experience|education|skills|work|employment|career|professional|summary|objective|qualifications)[:\s]+([a-zA-Z0-9\s.,;:!?()-]{20,200})/gi,
      /(?:university|college|degree|bachelor|master|phd|certification)[:\s]+([a-zA-Z0-9\s.,;:!?()-]{10,100})/gi,
      /(?:company|corporation|inc|ltd|llc|solutions|technologies|systems)[:\s]*([a-zA-Z0-9\s.,;:!?()-]{10,100})/gi,
      /(?:javascript|python|java|react|angular|vue|node|html|css|sql|aws|azure|docker)[:\s]*([a-zA-Z0-9\s.,;:!?()-]{10,100})/gi
    ];
    
    cvPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\w\s.,;:!?()-]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 20 && /[a-zA-Z]{3,}/.test(cleaned)) {
            readableTexts.push(cleaned);
          }
        });
      }
    });
    
    // Pattern 2: Look for sequences of readable text
    const readableSequences = text.match(/[A-Za-z][A-Za-z0-9\s.,;:!?()-]{30,}/g);
    if (readableSequences) {
      readableSequences.forEach(sequence => {
        const cleaned = sequence.replace(/[^\w\s.,;:!?()-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length > 30 && /[a-zA-Z]{5,}/.test(cleaned)) {
          readableTexts.push(cleaned);
        }
      });
    }
    
    if (readableTexts.length > 0) {
      const result = readableTexts.join(' ').trim();
      console.log(`✅ Binary search found ${readableTexts.length} text segments, total: ${result.length} characters`);
      return result.length > 50 ? result : null;
    }
    
    console.log('❌ No readable text found in binary search');
    return null;
  } catch (error) {
    console.error('❌ Binary text search failed:', error);
    return null;
  }
}

/**
 * Method 4: Enhanced pattern matching for any text content
 */
async function tryEnhancedPatternMatching(uint8Array: Uint8Array): Promise<string | null> {
  try {
    console.log('🎯 Attempting enhanced pattern matching...');
    
    // Try different encodings
    const encodings = ['utf-8', 'utf-16le', 'utf-16be', 'latin1'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { ignoreBOM: true, fatal: false });
        const text = decoder.decode(uint8Array);
        
        // Look for any meaningful text patterns
        const meaningfulTexts: string[] = [];
        
        // Extract any text that looks like names, companies, or skills
        const patterns = [
          /[A-Z][a-z]+\s+[A-Z][a-z]+/g, // Names like "John Smith"
          /[A-Z][a-zA-Z\s]+(?:Inc|Corp|Ltd|LLC|Company|Solutions|Technologies|University|College)/g, // Company/Education names
          /(?:JavaScript|Python|Java|React|Angular|Vue|Node\.js|HTML|CSS|SQL|AWS|Azure|Docker|Kubernetes)/gi, // Technologies
          /\b(?:Bachelor|Master|PhD|Degree|Certificate|Certification)\b[^.]{0,50}/gi, // Education
          /\b(?:Manager|Engineer|Developer|Analyst|Specialist|Coordinator|Director|Lead)\b[^.]{0,30}/gi, // Job titles
          /\b(?:experience|years|worked|developed|managed|led|created|implemented|designed)\b[^.]{0,100}/gi // Experience descriptions
        ];
        
        patterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const cleaned = match.replace(/[^\w\s.,;:!?()-]/g, ' ').replace(/\s+/g, ' ').trim();
              if (cleaned.length > 5 && /[a-zA-Z]{3,}/.test(cleaned)) {
                meaningfulTexts.push(cleaned);
              }
            });
          }
        });
        
        if (meaningfulTexts.length > 3) {
          const result = meaningfulTexts.join('. ').trim();
          console.log(`✅ Enhanced pattern matching (${encoding}) found ${meaningfulTexts.length} segments, total: ${result.length} characters`);
          return result.length > 50 ? result : null;
        }
      } catch (encodingError) {
        console.log(`❌ Encoding ${encoding} failed:`, encodingError.message);
      }
    }
    
    console.log('❌ Enhanced pattern matching found no meaningful content');
    return null;
  } catch (error) {
    console.error('❌ Enhanced pattern matching failed:', error);
    return null;
  }
}

/**
 * Extract text from XML content
 */
function extractTextFromXML(xmlContent: string): string {
  const textParts: string[] = [];
  
  try {
    // Extract from w:t elements
    const textElementRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let match;
    
    while ((match = textElementRegex.exec(xmlContent)) !== null) {
      let textContent = match[1];
      textContent = decodeXmlEntities(textContent);
      
      if (textContent.trim().length > 0) {
        textParts.push(textContent.trim());
      }
    }
    
    // If we didn't get enough content, try extracting from paragraphs
    if (textParts.length < 5) {
      const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs;
      while ((match = paragraphRegex.exec(xmlContent)) !== null) {
        const paraContent = match[1];
        
        // Remove XML tags and extract text
        const cleanContent = paraContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanContent.length > 2) {
          textParts.push(cleanContent);
        }
      }
    }
    
    const result = textParts.join(' ').trim();
    console.log(`📝 XML extraction result: ${textParts.length} parts, ${result.length} characters`);
    
    return result;
  } catch (error) {
    console.error('❌ XML text extraction failed:', error);
    return textParts.join(' ').trim();
  }
}

/**
 * Decode XML entities
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
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