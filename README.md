# CV Analyzer - Enhanced OpenAI File API Implementation

A clean Python script that analyzes up to 200 CVs (PDF or DOCX) using OpenAI's GPT-4o with enhanced validation and retry logic.

## 🚀 Key Features

- ✅ **Direct OpenAI Upload**: Uses `/v1/files` endpoint - no PDF parsing libraries needed
- ✅ **File Message Type**: Leverages Chat Completions API with file attachments
- ✅ **Enhanced JSON Validation**: Validates GPT responses with retry logic
- ✅ **Detailed Analysis**: 400+ character summaries with at least 3 relevant tags
- ✅ **Smart Caching**: Skips re-uploading files with same name (bonus feature)
- ✅ **Progress Tracking**: Real-time progress with time estimates
- ✅ **CSV Export**: Results saved to `results_<timestamp>.csv` with filename, score, summary, tags
- ✅ **Robust Error Handling**: Graceful handling of failed uploads/analysis with fallbacks
- ✅ **Automatic Cleanup**: Optional cleanup of uploaded files from OpenAI
- ✅ **Easily Adjustable**: System prompt and job description easily customizable

## 📋 Requirements

- Python 3.8+
- OpenAI API key
- CV files in PDF or DOCX format (max 512MB each)

## 🛠️ Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up your OpenAI API key:**
   ```bash
   # Option 1: Environment variable
   export OPENAI_API_KEY="sk-your-api-key-here"
   
   # Option 2: Create .env file
   echo "OPENAI_API_KEY=sk-your-api-key-here" > .env
   ```

3. **Create job description:**
   ```bash
   # Edit job.txt with your job description (minimum 100 characters)
   nano job.txt
   ```

4. **Add CV files:**
   ```bash
   # Create uploads folder and add CV files
   mkdir uploads
   # Copy your PDF/DOCX files to uploads/
   ```

5. **Run the analyzer:**
   ```bash
   python cv_analyzer.py
   ```

## 📁 File Structure

```
cv-analyzer/
├── cv_analyzer.py              # Main script
├── requirements.txt            # Dependencies
├── README.md                  # This file
├── .env                       # Your API key (create this)
├── job.txt                    # Job description (create this)
├── uploads/                   # CV files go here
│   ├── john_doe_cv.pdf
│   ├── jane_smith_resume.docx
│   └── ...
├── uploaded_files_cache.json  # Cache of uploaded files (auto-generated)
└── results_YYYYMMDD_HHMMSS.csv # Generated results
```

## 📊 Enhanced Output Format

The script generates a CSV file with the following columns:

| Column   | Description                                    |
|----------|------------------------------------------------|
| filename | Original CV filename                           |
| score    | Match score (1-100)                          |
| summary  | Detailed analysis (minimum 400 characters)    |
| tags     | Comma-separated relevant tags (minimum 3)     |
| status   | 'success' or 'error'                         |

## 🎯 Enhanced Scoring System

- **90-100**: Exceptional candidate, immediate hire
- **80-89**: Strong candidate, definitely interview  
- **70-79**: Good candidate, worth considering
- **60-69**: Decent candidate with some gaps
- **50-59**: Marginal candidate, limited experience
- **40-49**: Poor fit, major gaps
- **Below 40**: Not suitable for role

## 🔧 New Enhanced Features

### JSON Validation & Retry Logic
- **Validates GPT responses** for proper JSON format
- **Checks required fields**: score (1-100), summary (400+ chars), tags (3+ items)
- **Automatic retry**: If GPT returns invalid JSON, retries once
- **Fallback responses**: If all attempts fail, provides structured fallback

### Detailed Analysis Requirements
- **Minimum 400 character summaries** with specific feedback
- **At least 3 relevant tags** based on actual CV content
- **Structured analysis** covering experience, skills, education, and fit

### Easy Customization
- **Adjustable system prompt** in `get_system_prompt()` method
- **Customizable analysis prompt** in `create_analysis_prompt()` method
- **Configurable job description** via `job.txt` file

### Enhanced Error Handling
- **Graceful failures** with meaningful error messages
- **Fallback responses** when AI analysis fails
- **Progress tracking** with time estimates
- **Detailed logging** of all operations

## 🚨 Important Notes

### File Limits
- **Maximum files**: 200 CVs per run
- **File size limit**: 512MB per file (OpenAI limit)
- **Supported formats**: PDF and DOCX only

### API Usage
- Uses OpenAI's `/v1/files` endpoint for uploads
- Uses GPT-4o with file attachments for analysis
- Includes 2-second delay between requests to avoid rate limits
- Automatic retry logic for failed API calls

### Cost Considerations
- File uploads are free
- Analysis uses GPT-4o tokens (check OpenAI pricing)
- Caching reduces repeated upload costs

## 🔍 Example Enhanced Output

```bash
🚀 CV Analyzer Starting...
============================================================
📋 Loading job description...
✅ Job description loaded (1247 chars)
📝 Job preview: Senior Software Engineer position requiring...
📁 Found 15 CV files

[1/15] Processing john_doe_cv.pdf
  📤 Uploading john_doe_cv.pdf to OpenAI...
  ✅ Uploaded successfully: file-abc123
  🤖 Analyzing with GPT-4o...
  ✅ Score: 85% | Tags: Senior level, React expert, 7+ years experience
  📝 Summary: John Doe demonstrates exceptional technical capabilities with 7 years of progressive software development experience...

[2/15] Processing jane_smith_resume.docx
  ♻️  Using cached file ID for jane_smith_resume.docx
  🤖 Analyzing with GPT-4o...
  ⚠️  Attempt 1 failed: Summary too short, retrying...
  🔄 Retry attempt 2/2
  ✅ Score: 92% | Tags: Senior level, Full-stack developer, Computer Science degree
  📝 Summary: Jane Smith brings comprehensive full-stack development expertise with strong technical foundation...

============================================================
📊 DETAILED RESULTS SUMMARY
============================================================
Total files processed: 15
Successfully analyzed: 14
Failed to process: 1
Average score: 73.2%
High scores (70+): 8
Medium scores (50-69): 4
Low scores (<50): 2

🏆 TOP 10 CANDIDATES:
 1. jane_smith_resume.docx        |  92% | Senior level, Full-stack developer, Computer Science degree
    Summary: Jane Smith brings comprehensive full-stack development expertise with strong technical foundation in React, Node.js, and cloud platforms...

 2. john_doe_cv.pdf              |  85% | Senior level, React expert, 7+ years experience
    Summary: John Doe demonstrates exceptional technical capabilities with 7 years of progressive software development experience, particularly strong in frontend technologies...

💾 Results saved to: results_20241208_143022.csv

🧹 Clean up uploaded files from OpenAI? (y/N): y
🧹 Cleaning up uploaded files from OpenAI...
  🗑️  Deleted jane_smith_resume.docx from OpenAI
  🗑️  Deleted john_doe_cv.pdf from OpenAI

✅ Analysis complete!

📈 INSIGHTS:
   • Best candidate: jane_smith_resume.docx (92%)
   • Score range: 45% - 92%
   • Recommended for interview: 8 candidates
```

## 🛠️ Customization Guide

### Adjust System Prompt
Edit the `get_system_prompt()` method in `cv_analyzer.py`:

```python
def get_system_prompt(self) -> str:
    return """Your custom system prompt here..."""
```

### Modify Analysis Criteria
Edit the `create_analysis_prompt()` method to change:
- Scoring guidelines
- Analysis focus areas
- Required output format

### Change Job Description
Simply edit the `job.txt` file with your specific job requirements.

## 📝 CSV Output Example

```csv
filename,score,summary,tags,status
john_doe_cv.pdf,85,"John Doe demonstrates exceptional technical capabilities with 7 years of progressive software development experience, particularly strong in frontend technologies including React and Vue.js. His background at TechCorp Solutions shows leadership experience managing teams of 3-5 developers. Strong educational foundation with Computer Science degree from University of Technology. However, limited backend experience with Node.js may require additional training for full-stack responsibilities.","Senior level, React expert, 7+ years experience, Team leadership, Computer Science degree",success
jane_smith_resume.docx,92,"Jane Smith brings comprehensive full-stack development expertise with strong technical foundation in React, Node.js, and cloud platforms. Her 8 years of experience includes significant work at Fortune 500 companies with proven track record of delivering scalable applications. AWS certification and microservices architecture experience directly align with job requirements. Excellent communication skills demonstrated through technical writing and mentoring roles.","Senior level, Full-stack developer, Computer Science degree, AWS certified, Microservices experience, 8+ years experience",success
```

## 🤝 FastAPI Migration Ready

The code is structured with clear separation of responsibilities, making it easy to migrate to FastAPI later:

- `CVAnalyzer` class can become a service
- `process_cv()` method can become an API endpoint
- Configuration methods can become dependency injection
- Error handling is already structured for API responses

## 📄 License

This project is open source and available under the MIT License.

---

**Happy CV analyzing with enhanced validation! 🎯**