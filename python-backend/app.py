import os
import base64
import json
import logging
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import PyPDF2
import docx
from io import BytesIO
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CV Analysis Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CVAnalysisRequest(BaseModel):
    file_data: str  # base64 encoded file
    filename: str
    file_type: str
    job_description: str
    openai_api_key: str

class CVAnalysisResponse(BaseModel):
    extracted_text: str
    score: int
    summary: str
    tags: List[str]

def extract_text_from_pdf(file_data: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = BytesIO(file_data)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(file_data: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc_file = BytesIO(file_data)
        doc = docx.Document(doc_file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to extract text from DOCX: {str(e)}")

def analyze_cv_with_openai(cv_text: str, job_description: str, api_key: str) -> Dict[str, Any]:
    """Analyze CV using OpenAI GPT-4"""
    try:
        client = openai.OpenAI(api_key=api_key)
        
        prompt = f"""
        Analyze this CV against the job description and provide a detailed assessment.

        Job Description:
        {job_description}

        CV Content:
        {cv_text}

        Please provide your analysis in the following JSON format:
        {{
            "score": <integer between 1-100>,
            "summary": "<detailed summary of at least 400 characters explaining the candidate's fit, strengths, weaknesses, and specific recommendations>",
            "tags": ["<relevant skill/experience tags>"]
        }}

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
        2. Education and qualifications
        3. Career progression and achievements
        4. Specific technologies/tools mentioned in job description
        5. Overall presentation and professionalism

        Provide specific examples from the CV to support your assessment.
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert HR recruiter and CV analyst. Provide detailed, objective assessments of candidates."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )

        result_text = response.choices[0].message.content.strip()
        
        # Try to parse JSON from the response
        try:
            # Find JSON in the response (it might be wrapped in markdown)
            start_idx = result_text.find('{')
            end_idx = result_text.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                json_str = result_text[start_idx:end_idx]
                result = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse JSON from OpenAI response: {e}")
            # Fallback: create a structured response
            result = {
                "score": 50,
                "summary": result_text[:800] if len(result_text) > 800 else result_text,
                "tags": ["general", "needs_review"]
            }

        # Validate and clean the result
        if not isinstance(result.get("score"), int) or not (1 <= result["score"] <= 100):
            result["score"] = 50
        
        if not isinstance(result.get("summary"), str) or len(result["summary"]) < 100:
            result["summary"] = f"Analysis completed. Score: {result['score']}/100. " + (result.get("summary", ""))[:400]
        
        if not isinstance(result.get("tags"), list):
            result["tags"] = ["general"]

        return result

    except Exception as e:
        logger.error(f"OpenAI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cv-analysis-backend"}

@app.post("/analyze-cv", response_model=CVAnalysisResponse)
async def analyze_cv(request: CVAnalysisRequest):
    """Analyze a CV file"""
    try:
        logger.info(f"Analyzing CV: {request.filename}")
        
        # Decode base64 file data
        try:
            file_data = base64.b64decode(request.file_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 file data: {str(e)}")
        
        # Extract text based on file type
        if request.file_type.lower() == 'application/pdf':
            extracted_text = extract_text_from_pdf(file_data)
        elif request.file_type.lower() in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
            extracted_text = extract_text_from_docx(file_data)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {request.file_type}")
        
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the file")
        
        # Analyze with OpenAI
        analysis_result = analyze_cv_with_openai(extracted_text, request.job_description, request.openai_api_key)
        
        logger.info(f"Successfully analyzed CV: {request.filename}, Score: {analysis_result['score']}")
        
        return CVAnalysisResponse(
            extracted_text=extracted_text,
            score=analysis_result["score"],
            summary=analysis_result["summary"],
            tags=analysis_result["tags"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error analyzing CV {request.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)