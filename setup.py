#!/usr/bin/env python3
"""
Quick setup for Enhanced CV Analyzer
"""

import os
from pathlib import Path

def setup():
    print("🔧 Setting up Enhanced CV Analyzer...")
    
    # Create uploads folder
    uploads = Path("uploads")
    uploads.mkdir(exist_ok=True)
    print(f"✅ Created: {uploads}")
    
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
        
        with open(job_file, 'w') as f:
            f.write(example_job)
        print(f"✅ Created: {job_file}")
    
    # Create .env file
    env_file = Path(".env")
    if not env_file.exists():
        with open(env_file, 'w') as f:
            f.write("# Add your OpenAI API key here\n")
            f.write("OPENAI_API_KEY=your_api_key_here\n")
        print(f"✅ Created: {env_file}")
        print("⚠️  Please edit .env and add your OpenAI API key")
    
    print("\n📋 Next steps:")
    print("1. pip install -r requirements.txt")
    print("2. Edit .env with your OpenAI API key")
    print("3. Add CV files to uploads/ folder")
    print("4. Edit job.txt with your job description (optional)")
    print("5. python cv_analyzer.py")
    print("\n🎯 Enhanced features:")
    print("• JSON validation with retry logic")
    print("• 400+ character detailed summaries")
    print("• Minimum 3 relevant tags per CV")
    print("• Enhanced error handling with fallbacks")
    print("• Easy customization of prompts")

if __name__ == "__main__":
    setup()