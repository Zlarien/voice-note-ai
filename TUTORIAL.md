# Voice Note AI - Tutorial

## Prerequisites
- A modern browser (Chrome, Edge recommended for best voice recognition)
- For full AI features: An OpenAI API key
- For backend setup: Python 3.11+ installed

## Setup

### Option 1: Quick Demo (No Backend Setup)
1. Open `frontend/index.html` in your browser
2. Note: This uses simulated AI suggestions (not real AI)
3. To use real AI, follow Option 2

### Option 2: Full Setup with Real AI
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Clone this repository
3. Navigate to the backend directory:
   ```bash
   cd voice-note-app/backend
   ```
4. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```
5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Start the backend server:
   ```bash
   python main.py
   ```
   (Should see: "Uvicorn running on http://0.0.0.0:8000")
7. Open `frontend/index.html` in your browser
8. The frontend will automatically connect to the backend at http://localhost:8000

## Usage

### Recording a Voice Note
1. Click the "Démarrer l'enregistrement" button (microphone icon)
2. Speak clearly into your microphone
3. Click "Arrêter l'enregistrement" (stop icon) when finished
4. Select the appropriate project type from the dropdown (General, YouTube Video, Video Game, Business, Creative)
5. Your note will appear in the list below

### Using AI Agents for Analysis
1. After recording a note, click the "Analyser avec les agents" button (robot icon) on the note card
2. Wait for the analysis to complete (shows "Analyse en cours avec les agents IA...")
3. A modal will appear showing:
   - Suggestions from each of the 5 AI agents (Researcher, Planner, Critic, Creator, Executor)
   - An improved version of your note incorporating all suggestions
4. You can either:
   - Click "Appliquer les suggestions" to update your note with the improved content
   - Click "Fermer" to close the modal without changes

### Listening to Your Notes
1. Click the "Écouter la note" button (volume icon) on any note card
2. The AI will read your note aloud using text-to-speech
3. You can pause/stop using your browser's audio controls

### Managing Notes
- To delete all notes: Click "Effacer les notes" (trash icon) and confirm
- Notes are automatically saved in your browser's localStorage
- For persistent storage across devices, consider deploying the backend to a cloud service

## Deployment

### Frontend (Static Site)
- GitHub Pages: Push the `frontend` folder to a repo and enable GitHub Pages
- Netlify: Drag and drop the `frontend` folder
- Vercel: Import the `frontend` folder as a project
- Any static web host

### Backend (API)
- Render.com: Create a new Web Service, connect your repo, set build command to `pip install -r requirements.txt` and start command to `python main.py`
- Railway: Similar to Render
- Fly.io: Deploy as a Docker container
- Remember to set the `OPENAI_API_KEY` environment variable in your deployment platform

## Troubleshooting

### "Votre navigateur ne supporte pas la reconnaissance vocale"
- Use Google Chrome or Microsoft Edge for best results
- Ensure you've granted microphone permissions to the site

### Connection errors to backend
- Verify the backend is running (`python main.py` in backend directory)
- Check that you're not blocking the site from accessing localhost:8000
- Ensure no firewall is blocking the connection

### AI features not working
- Verify your OpenAI API key is correct in the backend/.env file
- Check the backend logs for error messages
- Ensure you have internet access (required for OpenAI API)

## How It Works

### Voice Recognition
- Uses the browser's built-in Web Speech API for converting speech to text
- Optimized for French language (fr-FR)

### AI Processing
- Transcription: OpenAI Whisper model for high-accuracy speech-to-text
- Analysis: GPT-4o-mini for contextual understanding and suggestions
- Multi-Agent System: Five specialized AI agents work in parallel to provide diverse perspectives
- Text-to-Speech: OpenAI TTS for natural-sounding audio output

### Data Privacy
- Voice recordings are processed in real-time and not stored
- Notes are stored only in your browser's localStorage (unless you deploy the backend)
- Your OpenAI API key is only used on your backend server (if self-hosted)