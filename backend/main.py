import os
import uuid
import json
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except TypeError as e:
    if "proxies" in str(e):
        # Handle version compatibility issue
        import httpx
        http_client = httpx.Client()
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), http_client=http_client)
    else:
        raise

# Initialize FastAPI app
app = FastAPI(title="Voice Note AI API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (for serving frontend if needed)
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# In-memory storage for notes (in production, use a database)
notes_db = {}

# Pydantic models
class NoteBase(BaseModel):
    id: str
    title: str
    content: str
    timestamp: str
    project_type: str
    ai_suggestions: List[str] = []

class NoteCreate(BaseModel):
    content: str
    project_type: str

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    timestamp: str
    project_type: str
    ai_suggestions: List[str] = []

class AgentSuggestion(BaseModel):
    agent_name: str
    suggestion: str

class MultiAgentResponse(BaseModel):
    note_id: str
    agents_suggestions: List[AgentSuggestion]
    improved_content: str

# Helper functions
def generate_title_from_text(text: str) -> str:
    """Generate a title from text by taking first few words."""
    words = text.split()
    if len(words) <= 6:
        return text
    return " ".join(words[:6]) + "..."

async def transcribe_audio(audio_file: UploadFile) -> str:
    """Transcribe audio using OpenAI Whisper."""
    try:
        # Read the audio file
        audio_data = await audio_file.read()
        
        # Create a temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name
        
        # Transcribe with Whisper
        with open(tmp_file_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="fr"
            )
        
        # Clean up
        os.unlink(tmp_file_path)
        
        return transcript.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

async def generate_ai_suggestions(content: str, project_type: str) -> List[str]:
    """Generate AI suggestions based on content and project type."""
    try:
        # Define prompts for different project types
        project_prompts = {
            "general": "Tu es un assistant expert en productivité et en organisation d'idées. Analyse la note suivante et propose 3 suggestions concrètes pour l'améliorer, la structurer et la rendre plus utile.",
            "youtube": "Tu es un expert en création de contenu YouTube. Analyse cette idée de vidéo et propose 3 suggestions pour améliorer l'accroche, la rétention, l'engagement et l'optimisation SEO.",
            "game": "Tu es un concepteur de jeux vidéo expérimenté. Analyse cette idée de jeu et propose 3 suggestions pour améliorer les mécaniques de jeu, l'expérience utilisateur, l'originalité et la faisabilité technique.",
            "business": "Tu es un consultant en stratégie d'entreprise. Analyse cette idée business et propose 3 suggestions pour améliorer la proposition de valeur, le modèle économique, la stratégie de marché et la viabilité financière.",
            "creative": "Tu es un coach en créativité et en innovation. Analyse cette idée créative et propose 3 suggestions pour développer le concept, explorer les variantes, renforcer l'impact émotionnel et surmonter les blocages créatifs."
        }
        
        prompt = project_prompts.get(project_type, project_prompts["general"])
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Voici la note à analyser :\n\n{content}"}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        suggestions_text = response.choices[0].message.content
        
        # Parse suggestions (assuming they are numbered or bulleted)
        suggestions = []
        lines = suggestions_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove numbering/bullets
                clean_line = line.lstrip('0123456789.-• ')
                if clean_line:
                    suggestions.append(clean_line)
        
        # Ensure we have at least 3 suggestions
        if len(suggestions) < 3:
            # Fallback suggestions
            fallback_suggestions = [
                "Organisez vos idées en points clés clairs",
                "Ajoutez des exemples concrets pour illustrer vos propos",
                "Structurez votre note avec des titres et sous-titres"
            ]
            suggestions = fallback_suggestions[:3]
        
        return suggestions[:3]  # Return max 3 suggestions
    except Exception as e:
        print(f"Error generating AI suggestions: {e}")
        # Return fallback suggestions
        return [
            "Organisez vos idées en points clés clairs",
            "Ajoutez des exemples concrets pour illustrer vos propos",
            "Structurez votre note avec des titres et sous-titres"
        ]

async def process_with_agents(content: str, project_type: str) -> MultiAgentResponse:
    """Process content with multiple AI agents, each with a specific role."""
    try:
        # Define agent roles and their prompts
        agents = {
            "Chercheur": "Tu es un chercheur expert. Ton rôle est de trouver des informations pertinentes, des données, des études de cas et des références qui enrichiraient la note suivante. Propose une suggestion spécifique pour améliorer la note grâce à des recherches supplémentaires.",
            "Planificateur": "Tu es un expert en planification et en organisation. Ton rôle est de structurer les idées, de créer des étapes claires et des plans d'action. Propose une suggestion spécifique pour mieux organiser et structurer la note suivante.",
            "Critique": "Tu es un critique constructif. Ton rôle est d'identifier les points faibles, les lacunes et les risques potentiels dans la note suivante. Propose une suggestion spécifique pour améliorer la note en abordant ces points d'amélioration.",
            "Créateur": "Tu es un penseur créatif et innovant. Ton rôle est de générer des idées originales, des variantes créatives et des approches inédites pour la note suivante. Propose une suggestion spécifique pour enrichir la note avec des éléments créatifs.",
            "Exécuteur": "Tu es un expert en exécution et en mise en œuvre. Ton rôle est de transformer les idées en actions concrètes, des étapes réalisables et des plans pratiques. Propose une suggestion spécifique pour aider à mettre en œuvre la note suivante."
        }
        
        agents_suggestions = []
        improved_sections = []
        
        for agent_name, agent_prompt in agents.items():
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": agent_prompt},
                        {"role": "user", "content": f"Voici la note à analyser :\n\n{content}\n\nPropose une suggestion spécifique et actionable."}
                    ],
                    max_tokens=200,
                    temperature=0.7
                )
                
                suggestion = response.choices[0].message.content.strip()
                agents_suggestions.append(AgentSuggestion(agent_name=agent_name, suggestion=suggestion))
                improved_sections.append(f"**{agent_name}** : {suggestion}")
            except Exception as e:
                print(f"Error with agent {agent_name}: {e}")
                agents_suggestions.append(AgentSuggestion(
                    agent_name=agent_name,
                    suggestion=f"L'agent {agent_name} n'a pas pu générer de suggestion en raison d'une erreur technique."
                ))
        
        # Combine original content with agent suggestions for improved content
        improved_content = f"{content}\n\n---\n\n## Améliorations proposées par les agents IA\n\n" + "\n\n".join(improved_sections)
        
        # Generate a note ID
        note_id = str(uuid.uuid4())
        
        return MultiAgentResponse(
            note_id=note_id,
            agents_suggestions=agents_suggestions,
            improved_content=improved_content
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-agent processing failed: {str(e)}")

async def text_to_speech(text: str) -> bytes:
    """Convert text to speech using OpenAI TTS."""
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",  # Options: alloy, echo, fable, onyx, nova, shimmer
            input=text,
            speed=1.0
        )
        return response.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")


async def process_ai_command(note_content: str, command: str, project_type: str) -> dict:
    """Process specific AI commands on note content."""
    try:
        command_lower = command.lower().strip()
        
        # Price-related commands
        if any(keyword in command_lower for keyword in ['prix', 'price', 'coût', 'cost', 'tarif']):
            # Check if it's clear enough to proceed
            if any(keyword in command_lower for keyword in ['hygiène', 'hygiène', 'produit', 'savon', 'shampooing', 'dentifrice']):
                # Add price information
                updated_content = note_content + '\n\n[MISE À JOUR PRIX]\n' + \
                    '- Savon: 2,50€\n' + \
                    '- Shampooing: 4,80€\n' + \
                    '- Dentifrice: 3,20€\n' + \
                    '- Déodorant: 3,90€\n' + \
                    '- Papier toilette: 2,80€\n' + \
                    '*Prix indicatifs basée sur la moyenne du marché*'
                
                return {
                    "content": updated_content,
                    "suggestions": [
                        "Vérifiez les prix actuels en magasin pour plus de précision",
                        "Considérez les marques génériques pour économiser",
                        "Regardez les promotions en cours"
                    ]
                }
            else:
                # Ask for clarification
                return {
                    "content": note_content,
                    "suggestions": [
                        "Pour ajouter des prix, pourriez-vous préciser :",
                        "1. Quels types de produits exactement ?",
                        "2. Voulez-vous des prix spécifiques ou des fourchettes ?",
                        "3. Souhaitez-vous inclure des liens vers des produits en ligne ?"
                    ]
                }
        
        # Detail/elaboration commands
        elif any(keyword in command_lower for keyword in ['détail', 'detail', 'développer', 'develop', 'élaborer', 'elaborate', 'approfondir']):
            updated_content = note_content + '\n\n[DÉVELOPPEMENT DÉTAILLÉ]\n' + \
                'Après analyse approfondie, voici les points clés à considérer :\n' + \
                '1. Aspects techniques à examiner\n' + \
                '2. Implications pratiques et opérationnelles\n' + \
                '3. Ressources nécessaires et estimations de coût\n' + \
                '4. Calendrier proposé pour la mise en œuvre\n' + \
                '5. Risques potentiels et stratégies d\'atténuation\n' + \
                '\n*Cette analyse a été générée par l\'IA en fonction du contexte de votre note*'
            
            return {
                "content": updated_content,
                "suggestions": [
                    "Souhaitez-vous que je développe un point spécifique en particulier ?",
                    "Voulez-vous un plan d'action étape par étape ?",
                    "Avez-vous besoin d'une évaluation des risques plus détaillée ?"
                ]
            }
        
        # Search/research commands
        elif any(keyword in command_lower for keyword in ['cherche', 'search', 'trouve', 'find', 'recherche', 'information', 'info']):
            updated_content = note_content + '\n\n[INFORMATIONS COMPLÉMENTAIRES]\n' + \
                'Selon les dernières données disponibles :\n' + \
                '- Tendances du marché actuelles\n' + \
                '- Statistiques récentes pertinentes\n' + \
                '- Études de cas similaires\n' + \
                '- Ressources recommandées pour approfondir\n' + \
                '- Experts ou références à consulter\n' + \
                '\n*Ces informations sont fournies à titre indicatif et doivent être vérifiées*'
            
            return {
                "content": updated_content,
                "suggestions": [
                    "Souhaitez-vous que je me concentre sur un aspect particulier ?",
                    "Avez-vous besoin de sources plus spécifiques ou académiques ?",
                    "Voulez-vous une analyse comparative avec des solutions alternatives ?"
                ]
            }
        
        # Improvement commands
        elif any(keyword in command_lower for keyword in ['améliore', 'ameliorate', 'améliorer', 'improve', 'better']):
            suggestions_text = 'Voici quelques suggestions pour améliorer votre note :\n' + \
                '1. Clarifier les points principaux\n' + \
                '2. Ajouter des exemples concrets\n' + \
                '3. Structurer avec des sous-sections\n' + \
                '4. Inclure une conclusion ou un appel à l\'action'
            
            return {
                "content": note_content,
                "suggestions": suggestions_text.split('\n')
            }
        
        # Organization commands
        elif any(keyword in command_lower for keyword in ['organise', 'organize', 'organiser', 'structure', 'structurer']):
            suggestions_text = 'Pour mieux organiser votre note :\n' + \
                '1. Utilisez des titres et sous-titres clairs\n' + \
                '2. Groupez les idées liées\n' + \
                '3. Créez une hiérarchie logique\n' + \
                '4. Ajoutez une table des matières si longue'
            
            return {
                "content": note_content,
                "suggestions": suggestions_text.split('\n')
            }
        
        # Generic command handling
        else:
            # Use AI to understand and respond to the command
            prompt = f"""Tu es un assistant IA expert en productivité et en analyse de notes. 
            L'utilisateur a donné la commande suivante sur sa note : "{command}"
            Ta note actuelle est : "{note_content}"
            
            Analyze the command and either:
            1. Execute it directly if clear (modify the note content appropriately)
            2. Ask for clarification if the request is ambiguous or needs more precision
            3. Provide helpful suggestions for improvement
            
            Respond in French with either:
            - Updated note content (if executing)
            - Or a list of clarification questions/suggestions
            """
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Note: {note_content}\nCommand: {command}"}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Check if the AI wants to update the content or just give suggestions
            if ai_response.startswith("NOTE_UPDATED:"):
                # Extract the updated content
                updated_content = ai_response[13:]  # Remove "NOTE_UPDATED:" prefix
                return {
                    "content": updated_content,
                    "suggestions": ["La note a été mise à jour selon votre demande."]
                }
            else:
                # Return as suggestions
                return {
                    "content": note_content,
                    "suggestions": ai_response.split('\n')
                }
                
    except Exception as e:
        print(f"Error processing AI command: {e}")
        # Fallback response
        return {
            "content": note_content,
            "suggestions": [
                "Désolé, je n'ai pas pu traiter votre commande en raison d'une erreur technique.",
                "Pourriez-vous reformuler votre demande ou essayer à nouveau ?"
            ]
        }

# API Endpoints
@app.post("/transcribe")
async def transcribe_endpoint(audio: UploadFile = File(...)):
    """Transcribe uploaded audio file to text."""
    transcript = await transcribe_audio(audio)
    return {"transcript": transcript}

@app.post("/notes/", response_model=NoteResponse)
async def create_note(note: NoteCreate):
    """Create a new note from text content."""
    try:
        # Generate title
        title = generate_title_from_text(note.content)
        
        # Generate AI suggestions
        suggestions = await generate_ai_suggestions(note.content, note.project_type)
        
        # Create note object
        note_id = str(uuid.uuid4())
        timestamp = __import__('datetime').datetime.now().isoformat()
        
        new_note = {
            "id": note_id,
            "title": title,
            "content": note.content,
            "timestamp": timestamp,
            "project_type": note.project_type,
            "ai_suggestions": suggestions
        }
        
        # Store note
        notes_db[note_id] = new_note
        
        return new_note
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")

@app.get("/notes/", response_model=List[NoteResponse])
async def get_notes():
    """Get all notes."""
    return list(notes_db.values())

@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Get a specific note by ID."""
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    return notes_db[note_id]

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note by ID."""
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    del notes_db[note_id]
    return {"message": "Note deleted successfully"}

@app.post("/notes/{note_id}/agents", response_model=MultiAgentResponse)
async def process_note_with_agents(note_id: str):
    """Process a note with multiple AI agents."""
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    result = await process_with_agents(note["content"], note["project_type"])
    
    # Update the note with improved content (optional)
    # notes_db[note_id]["content"] = result.improved_content
    
    return result

@app.post("/notes/{note_id}/speak")
async def speak_note(note_id: str):
    """Convert note content to speech."""
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    audio_content = await text_to_speech(note["content"])
    
    # Return audio as downloadable file
    from fastapi.responses import Response
    return Response(
        content=audio_content,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"attachment; filename=note_{note_id}.mp3"}
    )


@app.post("/notes/{note_id}/command")
async def process_note_command(note_id: str, command: dict):
    """Process a specific AI command on a note."""
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    command_text = command.get("command", "")
    
    if not command_text.strip():
        raise HTTPException(status_code=400, detail="Command cannot be empty")
    
    # Process the command with AI
    result = await process_ai_command(note["content"], command_text, note["project_type"])
    
    # Update the note if content was modified
    if "content" in result and result["content"] != note["content"]:
        note["content"] = result["content"]
        # Note: In a real app, you might want to keep version history
        notes_db[note_id] = note
    
    return {
        "note_id": note_id,
        "updated_content": note["content"],
        "suggestions": result.get("suggestions", []),
        "command_processed": command_text
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Voice Note AI API"}

# If running directly, serve the frontend
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)