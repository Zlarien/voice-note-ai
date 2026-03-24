// Simplified Voice Note AI Frontend - Demo Version with Continuous Listening

// State
let recognition;
let isListening = false;
let isContinuous = false;
let notes = [];
let continuousTimeout = null;
let continuousTranscript = '';

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
    recognition.interimResults = true; // We need interim results for continuous mode
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        isListening = true;
        updateButtonStates();
        if (isContinuous) {
            showStatus('Écoute continue active... Parlez naturellement', 'listening');
        } else {
            showStatus('Écoute en cours... Parlez maintenant', 'listening');
        }
    };
    
    recognition.onresult = async (event) => {
        // Get the latest transcript
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            } else {
                transcript += event.results[i][0].transcript;
            }
        }
        
        if (isContinuous) {
            // In continuous mode, update live transcript and reset timer
            continuousTranscript = transcript;
            // Update a live preview element if exists
            updateLivePreview(transcript);
            
            // Reset the timeout
            if (continuousTimeout !== null) {
                clearTimeout(continuousTimeout);
            }
            // Set timeout to process after 2 seconds of silence
            continuousTimeout = setTimeout(async () => {
                if (continuousTranscript.trim() !== '') {
                    await handleVoiceInput(continuousTranscript);
                    continuousTranscript = '';
                    updateLivePreview('');
                }
            }, 2000); // 2 seconds of silence
        } else {
            // In normal mode, we only process final results
            if (event.results[0].isFinal) {
                await handleVoiceInput(transcript);
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        showStatus(`Erreur de reconnaissance: ${event.error}`, 'error');
    };
    
    recognition.onend = () => {
        isListening = false;
        updateButtonStates();
        if (isContinuous) {
            // In continuous mode, we automatically restart after a brief pause to keep listening
            // but we don't want to spam, so we wait a bit
            setTimeout(() => {
                if (isContinuous && !isListening) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Failed to restart continuous recognition:', e);
                    }
                }
            }, 1000);
            showStatus('Écoute en pause... Redémarrage bientôt', 'processing');
        } else {
            showStatus('Écoute terminée', 'processing');
            setTimeout(() => {
                hideStatus();
            }, 1500);
        }
    };
}

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startListening);
document.getElementById('stopBtn').addEventListener('click', stopListening);
document.getElementById('clearBtn').addEventListener('click', clearNotes);
document.getElementById('continuousToggle').addEventListener('click', toggleContinuous);

async function startListening() {
    if (!isListening && recognition) {
        try {
            // If continuous mode is on, we set continuous property
            if (isContinuous) {
                recognition.continuous = true;
            } else {
                recognition.continuous = false;
            }
            recognition.start();
        } catch (error) {
            showStatus(`Impossible de démarrer l'enregistrement: ${error.message}`, 'error');
        }
    }
}

function stopListening() {
    if (isListening && recognition) {
        recognition.stop();
        // If we were in continuous mode, we want to stop completely
        isContinuous = false;
        updateContinuousButton();
    }
}

async function clearNotes() {
    if (confirm('Voulez-vous vraiment supprimer toutes les notes ?')) {
        notes = [];
        await saveNotes();
        updateUI();
        showStatus('Toutes les notes ont été supprimées', 'processing');
        setTimeout(() => {
            hideStatus();
        }, 1500);
    }
}

function toggleContinuous() {
    isContinuous = !isContinuous;
    updateContinuousButton();
    
    if (isContinuous && isListening) {
        // If currently listening, restart with continuous mode
        stopListening();
        startListening();
    } else if (!isContinuous && isListening) {
        // Switching off continuous while listening: we'll stop and restart in normal mode
        stopListening();
        startListening();
    }
    
    showStatus(`Écoute ${isContinuous ? 'continue' : 'normale'} activée`, 'processing');
    setTimeout(() => {
        hideStatus();
    }, 1500);
}

function updateContinuousButton() {
    const btn = document.getElementById('continuousToggle');
    if (isContinuous) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-pause"></i> Écoute normale';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-redo"></i> Écoute continue';
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

// Live preview for continuous mode
function updateLivePreview(transcript) {
    let previewEl = document.getElementById('live-preview');
    if (!previewEl) {
        previewEl = document.createElement('div');
        previewEl.id = 'live-preview';
        previewEl.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            font-style: italic;
            color: #666;
            border: 1px dashed #ddd;
        `;
        const notesContainer = document.getElementById('notesContainer');
        notesContainer.parentNode.insertBefore(previewEl, notesContainer);
    }
    previewEl.textContent = transcript || 'En attente de parole...';
}

// Handle voice input (same as before)
async function handleVoiceInput(transcript) {
    showStatus('Traitement de votre voix...', 'processing');
    
    try {
        // Create note object
        const newNote = {
            id: Date.now().toString(),
            title: generateTitleFromText(transcript),
            content: transcript,
            timestamp: new Date().toISOString(),
            projectType: document.getElementById('projectType').value,
            aiSuggestions: await generateAISuggestions(transcript, document.getElementById('projectType').value)
        };
        
        // Add to notes
        notes.push(newNote);
        
        // Save and update UI
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

// Generate title from text
function generateTitleFromText(text) {
    const words = text.trim().split(/\s+/);
    if (words.length <= 6) {
        return text.trim();
    }
    return words.slice(0, 6).join(' ') + '...';
}

// Generate AI suggestions (simplified version for demo)
async function generateAISuggestions(text, projectType) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple rule-based suggestions for demo
    const suggestionsMap = {
        general: [
            "Organisez vos idées en points clés",
            "Ajoutez des exemples concrets pour illustrer vos propos",
            "Structurez votre note avec des titres et sous-titres"
        ],
        youtube: [
            "Créez un accroche forte pour les 15 premières secondes",
            "Planifiez un appel à l'action clair à la fin de votre vidéo",
            "Incluez des éléments visuels pertinents (B-roll, graphiques)"
        ],
        game: [
            "Définissez clairement les mécaniques de jeu principales",
            "Pensez à l'expérience utilisateur et à l'accessibilité",
            "Établissez un calendrier de développement réaliste"
        ],
        business: [
            "Identifiez votre proposition de valeur unique",
            "Analysez votre marché cible et vos concurrents",
            "Établissez des objectifs SMART et mesurables"
        ],
        creative: [
            "Explorez différentes variantes de votre concept",
            "Pensez aux émotions que vous voulez évoquer",
            "Considérez les contraintes techniques ou matérielles"
        ]
    };
    
    return suggestionsMap[projectType] || suggestionsMap.general;
}

// Load notes from localStorage
function loadNotes() {
    try {
        const savedNotes = localStorage.getItem('voiceNotes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        notes = [];
    }
}

// Save notes to localStorage
function saveNotes() {
    try {
        localStorage.setItem('voiceNotes', JSON.stringify(notes));
    } catch (error) {
        console.error('Error saving notes:', error);
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
}

// Create note element
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
        <div class="note-item">
            <div class="note-header">
                <div class="note-title">${note.title}</div>
                <div class="note-timestamp">${formattedDate}</div>
            </div>
            <div class="note-content">${note.content}</div>
            ${note.aiSuggestions && note.aiSuggestions.length > 0 ? `
                <div class="ai-suggestions">
                    <h3><i class="fas fa-lightbulb"></i> Suggestions de l'IA</h3>
                    <ul>
                        ${note.aiSuggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}