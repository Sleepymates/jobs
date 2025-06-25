#!/usr/bin/env python3
"""
CV Analyzer - Enhanced OpenAI File API Implementation

This script analyzes up to 200 CVs (PDF or DOCX) using OpenAI's GPT-4o.
- Uploads files directly to OpenAI via /v1/files endpoint
- Uses Chat Completions API with file message type
- Evaluates CVs against job description from job.txt
- Outputs structured JSON with score (0-100), detailed summary, and tags
- Saves results to CSV with timestamp
- Includes robust error handling, JSON validation, and retry logic
- Bonus: Skips re-uploading files with same name

Usage:
1. Place CV files in /uploads/ folder
2. Create job.txt with job description
3. Set OPENAI_API_KEY environment variable
4. Run: python cv_analyzer.py
"""

import os
import json
import csv
import time
from pathlib import Path
from typing import List, Dict, Optional, Set
from datetime import datetime
import hashlib

# Third-party imports
try:
    import openai
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("Please install: pip install openai python-dotenv")
    exit(1)

# Load environment variables
load_dotenv()

class CVAnalyzer:
    def __init__(self):
        """Initialize the CV Analyzer"""
        # Get API key
        self.api_key = os.getenv('OPENAI_API_KEY', 'sk-N17bj6D9MpSXxF3wuhCZtX3K_vx330F0Boc_XsFwFQT3BlbkFJJ8tVnGBQ0PsdjhktFBewIiOB_8Dg33zkBC3DtO9SQA')
        if not self.api_key:
            print("❌ OPENAI_API_KEY not found in environment variables")
            print("Please set it in .env file or environment")
            exit(1)
        
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=self.api_key)
        
        # Setup paths
        self.uploads_folder = Path("uploads")
        self.job_file = Path("job.txt")
        self.cache_file = Path("uploaded_files_cache.json")
        
        # Create uploads folder if needed
        self.uploads_folder.mkdir(exist_ok=True)
        
        # Load cache of previously uploaded files
        self.uploaded_files_cache = self.load_cache()
        
        # System prompt for consistent analysis
        self.system_prompt = self.get_system_prompt()
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for GPT analysis - easily adjustable"""
        return """You are an expert HR recruiter and CV analyst with 15+ years of experience. 
        You provide detailed, objective, and specific assessments of candidates based on their actual CV content.
        
        Your analysis must be:
        - Detailed and specific (minimum 400 characters in summary)
        - Based on actual CV content, not assumptions
        - Realistic in scoring (most candidates score 40-80)
        - Include at least 3 relevant tags based on actual skills/experience
        - Professional and constructive in tone"""
    
    def load_cache(self) -> Dict[str, str]:
        """Load cache of previously uploaded files"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}
    
    def save_cache(self):
        """Save cache of uploaded files"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.uploaded_files_cache, f, indent=2)
        except IOError as e:
            print(f"⚠️  Warning: Could not save cache: {e}")
    
    def upload_file_to_openai(self, file_path: Path) -> Optional[str]:
        """Upload file to OpenAI and return file ID"""
        try:
            # Check if file was already uploaded (by name)
            file_key = file_path.name
            if file_key in self.uploaded_files_cache:
                print(f"  ♻️  Using cached file ID for {file_path.name}")
                return self.uploaded_files_cache[file_key]
            
            print(f"  📤 Uploading {file_path.name} to OpenAI...")
            
            # Validate file size (max 512MB for OpenAI)
            file_size = file_path.stat().st_size
            if file_size > 512 * 1024 * 1024:
                raise ValueError("File too large (max 512MB for OpenAI)")
            
            if file_size < 100:  # Less than 100 bytes
                raise ValueError("File too small (likely empty)")
            
            # Upload file to OpenAI
            with open(file_path, 'rb') as f:
                file_response = self.client.files.create(
                    file=f,
                    purpose='assistants'
                )
            
            file_id = file_response.id
            print(f"  ✅ Uploaded successfully: {file_id}")
            
            # Cache the file ID
            self.uploaded_files_cache[file_key] = file_id
            self.save_cache()
            
            return file_id
            
        except Exception as e:
            print(f"  ❌ Upload failed: {str(e)}")
            return None
    
    def validate_json_response(self, response_text: str) -> Dict:
        """Validate and parse JSON response from GPT"""
        try:
            # Find JSON in the response (it might be wrapped in markdown)
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No JSON found in response")
            
            json_str = response_text[start_idx:end_idx]
            result = json.loads(json_str)
            
            # Validate required fields
            if not isinstance(result.get('score'), int):
                raise ValueError("Score must be an integer")
            
            if not (1 <= result['score'] <= 100):
                raise ValueError("Score must be between 1-100")
            
            if not isinstance(result.get('summary'), str):
                raise ValueError("Summary must be a string")
            
            if len(result['summary'].strip()) < 400:
                raise ValueError("Summary must be at least 400 characters")
            
            if not isinstance(result.get('tags'), list):
                raise ValueError("Tags must be a list")
            
            if len(result['tags']) < 3:
                raise ValueError("Must provide at least 3 tags")
            
            return result
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            raise ValueError(f"Invalid JSON response: {str(e)}")
    
    def analyze_cv_with_openai(self, file_id: str, job_description: str, filename: str) -> Dict:
        """Analyze CV using OpenAI Chat Completions with file - includes retry logic"""
        max_retries = 2
        
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    print(f"  🔄 Retry attempt {attempt + 1}/{max_retries}")
                
                print(f"  🤖 Analyzing with GPT-4o...")
                
                # Create the analysis prompt - easily adjustable
                prompt = self.create_analysis_prompt(job_description)
                
                # Make the API call with file attachment
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": self.system_prompt
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "text",
                                    "text": f"Please analyze this CV file: {filename}"
                                }
                            ],
                            "attachments": [
                                {
                                    "file_id": file_id,
                                    "tools": [{"type": "file_search"}]
                                }
                            ]
                        }
                    ],
                    temperature=0.3,
                    max_tokens=1500
                )
                
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response from OpenAI")
                
                # Validate JSON response
                result = self.validate_json_response(content)
                
                print(f"  ✅ Score: {result['score']}% | Tags: {', '.join(result['tags'][:3])}")
                print(f"  📝 Summary: {result['summary'][:100]}...")
                
                return result
                
            except ValueError as e:
                print(f"  ⚠️  Attempt {attempt + 1} failed: {str(e)}")
                
                if attempt == max_retries - 1:
                    # Final attempt failed, return fallback
                    print(f"  ❌ All attempts failed, using fallback response")
                    return self.create_fallback_response(filename)
                
                # Wait before retry
                time.sleep(2)
                
            except Exception as e:
                print(f"  ❌ Analysis error: {str(e)}")
                return self.create_fallback_response(filename, str(e))
    
    def create_analysis_prompt(self, job_description: str) -> str:
        """Create the analysis prompt - easily adjustable"""
        return f"""
Analyze this CV against the job description and provide your assessment in the following JSON format:

{{
    "score": <integer between 1-100>,
    "summary": "<detailed summary of at least 400 characters explaining the candidate's fit, strengths, weaknesses, and specific recommendations>",
    "tags": ["<relevant skill/experience tag>", "<experience level tag>", "<education/qualification tag>", "<additional relevant tags>"]
}}

Job Description:
{job_description}

Scoring Guidelines:
- 90-100: Exceptional candidate, immediate hire
- 80-89: Strong candidate, definitely interview
- 70-79: Good candidate, worth considering
- 60-69: Decent candidate with some gaps
- 50-59: Marginal candidate, limited experience
- 40-49: Poor fit, major gaps
- Below 40: Not suitable for role

Focus on:
1. Relevant experience and skills match
2. Education and qualifications alignment
3. Career progression and achievements
4. Technical skills mentioned in job description
5. Overall presentation and professionalism

Summary Requirements:
- Minimum 400 characters
- Mention specific skills, experience, and qualifications from the CV
- Provide constructive feedback and recommendations
- Be specific about strengths and areas for improvement

Tags Requirements:
- At least 3 tags
- Include experience level (e.g., "5+ years experience", "Senior level")
- Include key skills (e.g., "Python expert", "React developer")
- Include education/qualifications (e.g., "Computer Science degree", "MBA")
- Include relevant soft skills or industry experience

Provide specific examples from the CV to support your assessment.
"""
    
    def create_fallback_response(self, filename: str, error_msg: str = None) -> Dict:
        """Create a fallback response when AI analysis fails"""
        return {
            "score": 50,
            "summary": f"Analysis of {filename} could not be completed automatically. " + 
                      (f"Error: {error_msg}. " if error_msg else "") +
                      "Manual review recommended to assess candidate's qualifications, experience, and fit for the role. " +
                      "Please review the CV directly to evaluate technical skills, work history, education, and overall presentation. " +
                      "Consider scheduling an interview if the candidate meets basic requirements based on manual assessment.",
            "tags": ["manual_review_needed", "analysis_incomplete", "requires_human_assessment"]
        }
    
    def load_job_description(self) -> str:
        """Load job description from job.txt - easily adjustable"""
        if not self.job_file.exists():
            print(f"❌ {self.job_file} not found")
            print("Please create job.txt with your job description")
            exit(1)
        
        with open(self.job_file, 'r', encoding='utf-8') as f:
            job_desc = f.read().strip()
        
        if len(job_desc) < 100:
            print("❌ Job description too short (minimum 100 characters for accurate analysis)")
            exit(1)
        
        return job_desc
    
    def get_cv_files(self) -> List[Path]:
        """Get list of CV files (PDF and DOCX only)"""
        files = []
        supported_extensions = {'.pdf', '.docx'}
        
        for file_path in self.uploads_folder.iterdir():
            if (file_path.is_file() and 
                file_path.suffix.lower() in supported_extensions):
                files.append(file_path)
        
        # Sort by name for consistent processing order
        return sorted(files)
    
    def process_cv(self, file_path: Path, job_description: str) -> Dict:
        """Process a single CV file"""
        filename = file_path.name
        
        try:
            print(f"  📄 Processing {filename}...")
            
            # Upload file to OpenAI
            file_id = self.upload_file_to_openai(file_path)
            if not file_id:
                raise ValueError("Failed to upload file to OpenAI")
            
            # Analyze with OpenAI
            result = self.analyze_cv_with_openai(file_id, job_description, filename)
            
            return {
                'filename': filename,
                'score': result['score'],
                'summary': result['summary'],
                'tags': ', '.join(result['tags']),
                'status': 'success',
                'file_id': file_id
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ❌ Error: {error_msg}")
            fallback = self.create_fallback_response(filename, error_msg)
            return {
                'filename': filename,
                'score': fallback['score'],
                'summary': fallback['summary'],
                'tags': ', '.join(fallback['tags']),
                'status': 'error',
                'file_id': None
            }
    
    def save_to_csv(self, results: List[Dict]) -> str:
        """Save results to CSV with enhanced format"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_file = f"results_{timestamp}.csv"
        
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['filename', 'score', 'summary', 'tags', 'status'])
            writer.writeheader()
            for result in results:
                writer.writerow({
                    'filename': result['filename'],
                    'score': result['score'],
                    'summary': result['summary'],
                    'tags': result['tags'],
                    'status': result['status']
                })
        
        return csv_file
    
    def cleanup_uploaded_files(self, results: List[Dict]):
        """Clean up uploaded files from OpenAI (optional)"""
        print("\n🧹 Cleaning up uploaded files from OpenAI...")
        
        for result in results:
            if result.get('file_id') and result['status'] == 'success':
                try:
                    self.client.files.delete(result['file_id'])
                    print(f"  🗑️  Deleted {result['filename']} from OpenAI")
                except Exception as e:
                    print(f"  ⚠️  Could not delete {result['filename']}: {e}")
        
        # Clear the cache since files are deleted
        self.uploaded_files_cache.clear()
        self.save_cache()
    
    def run_analysis(self):
        """Main analysis function"""
        print("🚀 CV Analyzer Starting...")
        print("=" * 60)
        
        # Load job description
        print("📋 Loading job description...")
        job_description = self.load_job_description()
        print(f"✅ Job description loaded ({len(job_description)} chars)")
        
        # Show preview of job description
        preview = job_description[:200].replace('\n', ' ')
        print(f"📝 Job preview: {preview}...")
        
        # Get CV files
        cv_files = self.get_cv_files()
        if not cv_files:
            print(f"❌ No CV files found in {self.uploads_folder}")
            print("Please add .pdf or .docx files to the uploads folder")
            return
        
        # Limit to 200 files
        if len(cv_files) > 200:
            print(f"⚠️  Found {len(cv_files)} files, limiting to 200")
            cv_files = cv_files[:200]
        
        print(f"📁 Found {len(cv_files)} CV files")
        
        # Process each CV
        results = []
        start_time = time.time()
        
        for i, file_path in enumerate(cv_files, 1):
            print(f"\n[{i}/{len(cv_files)}] Processing {file_path.name}")
            
            result = self.process_cv(file_path, job_description)
            results.append(result)
            
            # Show progress
            elapsed = time.time() - start_time
            avg_time = elapsed / i
            remaining = (len(cv_files) - i) * avg_time
            print(f"  ⏱️  Elapsed: {elapsed:.1f}s | Est. remaining: {remaining:.1f}s")
            
            # Small delay to avoid rate limits
            if i < len(cv_files):
                time.sleep(2)
        
        # Sort by score (successful ones first)
        successful = [r for r in results if r['status'] == 'success']
        failed = [r for r in results if r['status'] == 'error']
        successful.sort(key=lambda x: x['score'], reverse=True)
        
        all_results = successful + failed
        
        # Print detailed summary
        print("\n" + "=" * 60)
        print("📊 DETAILED RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total files processed: {len(results)}")
        print(f"Successfully analyzed: {len(successful)}")
        print(f"Failed to process: {len(failed)}")
        
        if successful:
            avg_score = sum(r['score'] for r in successful) / len(successful)
            high_scores = [r for r in successful if r['score'] >= 70]
            medium_scores = [r for r in successful if 50 <= r['score'] < 70]
            low_scores = [r for r in successful if r['score'] < 50]
            
            print(f"Average score: {avg_score:.1f}%")
            print(f"High scores (70+): {len(high_scores)}")
            print(f"Medium scores (50-69): {len(medium_scores)}")
            print(f"Low scores (<50): {len(low_scores)}")
            
            print(f"\n🏆 TOP 10 CANDIDATES:")
            for i, result in enumerate(successful[:10], 1):
                tags_preview = result['tags'][:50] + '...' if len(result['tags']) > 50 else result['tags']
                print(f"{i:2d}. {result['filename']:<30} | {result['score']:3d}% | {tags_preview}")
                print(f"    Summary: {result['summary'][:100]}...")
                print()
        
        if failed:
            print(f"\n❌ FAILED FILES:")
            for result in failed:
                print(f"   {result['filename']:<30} | {result['summary'][:80]}...")
        
        # Save to CSV
        csv_file = self.save_to_csv(all_results)
        print(f"\n💾 Results saved to: {csv_file}")
        
        # Ask about cleanup
        if successful:
            cleanup = input("\n🧹 Clean up uploaded files from OpenAI? (y/N): ").lower().strip()
            if cleanup == 'y':
                self.cleanup_uploaded_files(all_results)
        
        print("✅ Analysis complete!")
        
        # Additional insights
        if successful:
            print(f"\n📈 INSIGHTS:")
            print(f"   • Best candidate: {successful[0]['filename']} ({successful[0]['score']}%)")
            if len(successful) > 1:
                print(f"   • Score range: {successful[-1]['score']}% - {successful[0]['score']}%")
            print(f"   • Recommended for interview: {len([r for r in successful if r['score'] >= 70])} candidates")

def main():
    """Main function"""
    try:
        analyzer = CVAnalyzer()
        analyzer.run_analysis()
    except KeyboardInterrupt:
        print("\n⏹️  Analysis stopped by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())