# CV Analysis Backend

A FastAPI-based service for analyzing CVs using OpenAI GPT-4.

## Features

- PDF and DOCX text extraction
- AI-powered CV analysis with scoring
- RESTful API with automatic documentation
- CORS support for web applications
- Health check endpoint

## Quick Deploy to Render

1. **Fork this repository** or push your code to GitHub
2. **Go to [Render.com](https://render.com)** and sign up/login
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure the service:**
   - **Name**: `cv-analysis-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Plan**: Free (sufficient for testing)

6. **Deploy** - Render will automatically build and deploy your service
7. **Get your service URL** - It will be something like `https://cv-analysis-backend-xyz.onrender.com`

## Alternative: Deploy to Railway

1. **Go to [Railway.app](https://railway.app)** and sign up/login
2. **Click "New Project" → "Deploy from GitHub repo"**
3. **Select your repository**
4. **Railway will auto-detect Python** and deploy automatically
5. **Get your service URL** from the Railway dashboard

## Alternative: Use ngrok for Local Testing

If you want to test locally with a public URL:

```bash
# Install ngrok
npm install -g ngrok

# Run your Python backend locally
cd python-backend
python app.py

# In another terminal, expose it publicly
ngrok http 8000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and use it as your `PYTHON_SERVICE_URL`.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

The service will be available at `http://localhost:8000`

## API Documentation

Once deployed, visit `https://your-service-url/docs` for interactive API documentation.

## Environment Variables

No environment variables are required - the service accepts the OpenAI API key in the request payload for security.

## Endpoints

- `GET /health` - Health check
- `POST /analyze-cv` - Analyze a CV file

## Next Steps

After deploying your Python backend:

1. **Copy your service URL** (e.g., `https://cv-analysis-backend-xyz.onrender.com`)
2. **Go to your Supabase project dashboard**
3. **Navigate to Edge Functions → process-cv**
4. **Set environment variable:**
   - Key: `PYTHON_SERVICE_URL`
   - Value: Your deployed service URL
5. **Save and redeploy** the Edge Function

Your CV analysis should now work correctly!