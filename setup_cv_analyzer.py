#!/usr/bin/env python3
"""
Setup script for CV Analyzer
Creates necessary folders and example files
"""

import os
from pathlib import Path

def setup_cv_analyzer():
    """Set up the CV analyzer environment"""
    print("Setting up CV Analyzer...")
    
    # Create uploads folder
    uploads_folder = Path("uploads")
    uploads_folder.mkdir(exist_ok=True)
    print(f"✅ Created uploads folder: {uploads_folder.absolute()}")
    
    # Create example job description
    job_file = Path("job.txt")
    if not job_file.exists():
        example_job = """Senior Software Engineer - Full Stack Development

We are seeking a highly skilled Senior Software Engineer to join our dynamic development team. The ideal candidate will have extensive experience in full-stack web development and a passion for creating scalable, high-performance applications.

Key Responsibilities:
- Design and develop robust web applications using modern frameworks
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and well-documented code
- Participate in code reviews and mentor junior developers
- Optimize applications for maximum speed and scalability
- Stay up-to-date with emerging technologies and industry trends

Required Qualifications:
- Bachelor's degree in Computer Science or related field
- 5+ years of experience in software development
- Proficiency in JavaScript, Python, or Java
- Experience with React, Angular, or Vue.js
- Strong knowledge of databases (SQL and NoSQL)
- Experience with cloud platforms (AWS, Azure, or GCP)
- Familiarity with DevOps practices and CI/CD pipelines
- Excellent problem-solving and communication skills

Preferred Qualifications:
- Master's degree in Computer Science
- Experience with microservices architecture
- Knowledge of containerization (Docker, Kubernetes)
- Experience with agile development methodologies
- Open source contributions

We offer competitive compensation, comprehensive benefits, and opportunities for professional growth in a collaborative environment."""
        
        with open(job_file, 'w', encoding='utf-8') as f:
            f.write(example_job)
        print(f"✅ Created example job description: {job_file.absolute()}")
    else:
        print(f"✅ Job description file already exists: {job_file.absolute()}")
    
    # Create .env example
    env_example = Path(".env.example")
    if not env_example.exists():
        with open(env_example, 'w') as f:
            f.write("# OpenAI API Key\n")
            f.write("# Get your API key from: https://platform.openai.com/api-keys\n")
            f.write("OPENAI_API_KEY=your_openai_api_key_here\n")
        print(f"✅ Created .env example file: {env_example.absolute()}")
    
    # Check if .env exists
    env_file = Path(".env")
    if not env_file.exists():
        print(f"⚠️  Please create .env file with your OpenAI API key")
        print(f"   Copy {env_example.absolute()} to .env and add your API key")
    
    print("\n📋 Setup complete! Next steps:")
    print("1. Install requirements: pip install -r requirements.txt")
    print("2. Set your OpenAI API key in .env file")
    print("3. Place CV files (PDF/DOCX) in the uploads folder")
    print("4. Edit job.txt with your job description")
    print("5. Run: python cv_analyzer.py")

if __name__ == "__main__":
    setup_cv_analyzer()