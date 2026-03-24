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

### Using Continuous Listening Mode
1. Click the "Écoute continue" button (refresh icon) to activate continuous listening
2. The indicator will change to show continuous mode is active
3. Speak naturally - the system will listen continuously and create notes when it detects pauses in your speech (2 seconds of silence)
4. Click the button again to switch back to normal mode (tap-to-record)
5. Continuous mode is designed to avoid wasting credits by only processing after pauses

### Using AI Agents for Analysis
1. After recording a note, click the "Analyser avec les agents" button (robot icon) on the note card
2. Wait for the analysis to complete (shows "Analyse en cours avec les agents IA...")
3. A modal will appear showing:
   - Suggestions from each of the 5 AI agents (Researcher, Planner, Critic, Creator, Executor)
   - An improved version of your note incorporating all suggestions
4. You can either:
   - Click "Appliquer les suggestions" to update your note with the improved content
   - Click "Fermer" to close the modal without changes

### Using AI Commands on Notes
Each note now has a command bar where you can give specific instructions to the AI:
1. Type commands like:
   - "ajoute les prix" or "add prices" - to add price information to product lists
   - "détail l'idée" or "elaborate the idea" - to develop and expand on your note
   - "cherche des informations" or "search for information" - to research and add relevant data
   - "améliore cette note" or "improve this note" - for general improvement suggestions
2. Press Enter or click the "Exécuter" button
3. The AI will process your command and either:
   - Execute it directly if the request is clear
   - Ask for clarification if the request is ambiguous
4. You can continue refining with follow-up commands

### Using Tags for Organization
1. Select a note by clicking on it (it will be highlighted)
2. In the voice controls section, use the "Ajouter un tag..." input field to type a tag
3. Press Enter or click the "Ajouter Tag" button to add the tag to the selected note
4. Tags will appear under the note content and can be used for filtering and organization

### Using Slash Commands (/) 
1. Click anywhere in a note's content area to focus on it
2. Type "/" to open the quick command menu
3. Select from the available options:
   - `/prix` : Add price estimates for products mentioned
   - `/detail` : Develop and elaborate on the main idea
   - `/cherche` : Search for and add relevant information
   - `/améliore` : Get general improvement suggestions
   - `/organise` : Get organization and structuring advice
4. The selected command will be executed on the currently selected note

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

### Continuous listening not working
- Make sure you've clicked the "Écoute continue" button to activate the mode
- The system requires microphone permissions to be granted
- In continuous mode, notes are created after pauses in speech (2 seconds of silence)

### Tag system not working
- Make sure you've selected a note first (it should be highlighted)
- Tags can only be added to selected notes

### Slash commands not working
- Click in a note's content area first to focus on it
- Then type "/" to open the command menu

## How It Works

### Voice Recognition
- Uses the browser's built-in Web Speech API for converting speech to text
- Optimized for French language (fr-FR)
- Continuous mode uses interim results with smart pause detection to avoid excessive processing

### AI Processing
- Transcription: OpenAI Whisper model for high-accuracy speech-to-text
- Analysis and suggestions: GPT-4o-mini for contextual understanding and relevant suggestions
- Multi-Agent System: Five specialized AI agents work in parallel to provide diverse perspectives
- Text-to-Speech: OpenAI TTS for natural-sounding audio output
- Command Processing: Specialized handlers for price addition, elaboration, research, and general commands
- Tag System: Simple metadata system for organizing and filtering notes

### Data Privacy
- Voice recordings are processed in real-time and not stored
- Notes are stored only in your browser's localStorage (unless you deploy the backend)
- Your OpenAI API key is only used on your backend server (if self-hosted)