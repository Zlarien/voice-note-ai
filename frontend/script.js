// Voice Note AI Frontend Script - Connects to Backend API

// Configuration
const API_BASE_URL = '/api'; // Will be served from same origin

// State
let recognition;
let isListening = false;
let notes = [];
let currentNoteId = null;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSpeechRecognition();
    loadNotes();
    updateUI();
});

// Initialize speech recognition
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showStatus('Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.', 'error');
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        isListening = true;
        updateButtonStates();
        showStatus('Écoute en cours... Parlez maintenant', 'listening');
    };
    
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        await handleVoiceInput(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        showStatus(`Erreur de reconnaissance: ${event.error}`, 'error');
    };
    
    recognition.onend = () => {
        isListening = false;
        updateButtonStates();
        showStatus('Écoute terminée', 'processing');
        setTimeout(() => {
            hideStatus();
        }, 1500);
    };
}

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startListening);
document.getElementById('stopBtn').addEventListener('click', stopListening);
document.getElementById('clearBtn').addEventListener('click', clearNotes);

async function startListening() {
    if (!isListening && recognition) {
        try {
            recognition.start();
        } catch (error) {
            showStatus(`Impossible de démarrer l'enregistrement: ${error.message}`, 'error');
        }
    }
}

function stopListening() {
    if (isListening && recognition) {
        recognition.stop();
    }
}

async function clearNotes() {
    if (confirm('Voulez-vous vraiment supprimer toutes les notes ?')) {
        notes = [];
        currentNoteId = null;
        await saveNotes();
        updateUI();
        showStatus('Toutes les notes ont été supprimées', 'processing');
        setTimeout(() => {
            hideStatus();
        }, 1500);
    }
}

function updateButtonStates() {
    document.getElementById('startBtn').disabled = isListening;
    document.getElementById('stopBtn').disabled = !isListening;
}

function showStatus(message, type = 'processing') {
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('statusText');
    
    statusEl.className = `status ${type}`;
    statusTextEl.textContent = message;
    statusEl.style.display = 'block';
}

function hideStatus() {
    document.getElementById('status').style.display = 'none';
}

// Handle voice input
async function handleVoiceInput(transcript) {
    showStatus('Traitement de votre voix...', 'processing');
    
    try {
        // Send to backend to create note
        const response = await fetch(`${API_BASE_URL}/notes/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: transcript,
                project_type: document.getElementById('projectType').value
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newNote = await response.json();
        
        // Update local state
        notes.push(newNote);
        currentNoteId = newNote.id;
        
        // Update UI
        await saveNotes();
        updateUI();
        
        showStatus('Note enregistrée avec succès !', 'processing');
        setTimeout(() => {
            hideStatus();
        }, 1500);
    } catch (error) {
        console.error('Error creating note:', error);
        showStatus(`Erreur lors de l'enregistrement: ${error.message}`, 'error');
        setTimeout(() => {
            hideStatus();
        }, 2000);
    }
}

// Generate title from text (fallback if backend doesn't provide one)
function generateTitleFromText(text) {
    const words = text.trim().split(/\s+/);
    if (words.length <= 6) {
        return text.trim();
    }
    return words.slice(0, 6).join(' ') + '...';
}

// Load notes from backend
async function loadNotes() {
    try {
        const response = await fetch(`${API_BASE_URL}/notes/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        notes = await response.json();
    } catch (error) {
        console.error('Error loading notes:', error);
        // Fallback to localStorage if backend unavailable
        try {
            const savedNotes = localStorage.getItem('voiceNotes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            notes = [];
        }
    }
}

// Save notes to localStorage (backup)
async function saveNotes() {
    try {
        localStorage.setItem('voiceNotes', JSON.stringify(notes));
    } catch (error) {
        console.error('Error saving notes to localStorage:', error);
    }
}

// Update UI
function updateUI() {
    const container = document.getElementById('notesContainer');
    
    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucune note enregistrée pour le moment. Cliquez sur "Démarrer l'enregistrement" pour commencer !</p>
            </div>
        `;
        return;
    }
    
    // Sort notes by date (most recent first)
    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = sortedNotes.map(note => createNoteElement(note)).join('');
    
    // Add event listeners to newly created elements
    addNoteEventListeners();
}

function createNoteElement(note) {
    const date = new Date(note.timestamp);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="note-item" data-note-id="${note.id}">
            <div class="note-header">
                <div class="note-title">${note.title}</div>
                <div class="note-timestamp">${formattedDate}</div>
            </div>
            <div class="note-content">${note.content}</div>
            ${note.ai_suggestions && note.ai_suggestions.length > 0 ? `
                <div class="ai-suggestions">
                    <h3><i class="fas fa-lightbulb"></i> Suggestions de l'IA</h3>
                    <ul>
                        ${note.ai_suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div class="note-actions">
                <button class="btn btn-sm btn-outline" onclick="processWithAgents('${note.id}')">
                    <i class="fas fa-robot"></i> Analyser avec les agents
                </button>
                <button class="btn btn-sm btn-outline" onclick="speakNote('${note.id}')">
                    <i class="fas fa-volume-up"></i> Écouter la note
                </button>
            </div>
        </div>
    `;
}

// Add event listeners to note elements
function addNoteEventListeners() {
    document.querySelectorAll('.note-item').forEach(element => {
        element.addEventListener('click', function(e) {
            // Prevent double handling if clicking buttons inside
            if (e.target.closest('button')) return;
            
            const noteId = this.getAttribute('data-note-id');
            selectNote(noteId);
        });
    });
}

function selectNote(noteId) {
    // Visual selection
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`.note-item[data-note-id="${noteId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    currentNoteId = noteId;
}

// Process note with AI agents
async function processWithAgents(noteId) {
    showStatus('Analyse en cours avec les agents IA...', 'processing');
    
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}/agents`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show results in a modal or update the note
        showAgentResults(result);
        
        showStatus('Analyse terminée !', 'processing');
        setTimeout(() => {
            hideStatus();
        }, 1500);
    } catch (error) {
        console.error('Error processing with agents:', error);
        showStatus(`Erreur lors de l'analyse: ${error.message}`, 'error');
        setTimeout(() => {
            hideStatus();
        }, 2000);
    }
}

// Speak note using text-to-speech
async function speakNote(noteId) {
    showStatus('Génération de l\'audio...', 'processing');
    
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}/speak`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get audio blob and play it
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.play().then(() => {
            showStatus('Lecture en cours...', 'processing');
        }).catch(err => {
            console.error('Error playing audio:', err);
            showStatus('Erreur lors de la lecture audio', 'error');
        });
        
        audio.onended = () => {
            showStatus('Lecture terminée', 'processing');
            setTimeout(() => {
                hideStatus();
            }, 1500);
        };
        
        // Clean up object URL when done
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
    } catch (error) {
        console.error('Error speaking note:', error);
        showStatus(`Erreur lors de la synthèse vocale: ${error.message}`, 'error');
        setTimeout(() => {
            hideStatus();
        }, 2000);
    }
}

// Show agent results in a modal
function showAgentResults(result) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Analyse des agents IA</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${result.agents_suggestions.map(agent => `
                    <div class="agent-result">
                        <h4>${agent.agent_name}</h4>
                        <p>${agent.suggestion}</p>
                    </div>
                `).join('')}
                
                <div class="improved-content">
                    <h3>Contenu amélioré proposé</h3>
                    <p>${result.improved_content}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="applyAgentSuggestions('${result.note_id}')">
                    Appliquer les suggestions
                </button>
                <button class="btn btn-outline" onclick="closeModal()">
                    Fermer
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-outline').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function applyAgentSuggestions(noteId) {
    // In a full implementation, this would update the note with the improved content
    showStatus('Suggestions appliquées !', 'processing');
    closeModal();
    setTimeout(() => {
        hideStatus();
    }, 1500);
}

// Add some CSS for the modal and new button styles
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h2 {
            margin: 0;
            color: #2c3e50;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #95a5a6;
        }
        
        .modal-close:hover {
            color: #7f8c8d;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .agent-result {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #4facfe;
        }
        
        .agent-result h4 {
            margin-top: 0;
            color: #2c3e50;
        }
        
        .improved-content {
            background: #e8f4fd;
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            border-left: 4px solid #3498db;
        }
        
        .improved-content h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        
        .note-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .btn-sm {
            padding: 8px 16px;
            font-size: 0.9rem;
        }
        
        .btn-outline {
            border: 1px solid #ddd;
            background: white;
            color: #333;
        }
        
        .btn-outline:hover {
            background: #f8f9fa;
        }
        
        .note-item.selected {
            border: 2px solid #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
        }
    `;
    document.head.appendChild(style);
}

// Initialize custom styles
addCustomStyles();