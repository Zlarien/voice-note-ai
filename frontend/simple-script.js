// Enhanced Voice Note AI Frontend - Demo Version with Continuous Listening, Block System, and Notion-like Features

// State
let recognition;
let isListening = false;
let isContinuous = false;
let notes = [];
let continuousTimeout = null;
let continuousTranscript = '';
let selectedNoteId = null;
let isSlashMenuOpen = false;
let slashMenuElement = null;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSpeechRecognition();
    loadNotes();
    updateUI();
    initializeTagInput();
    initializeSlashCommand();
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

// Process AI command on a specific note via backend API
async function processAICommand(noteId, command) {
    // Find the note
    const note = notes.find(n => n.id === noteId);
    if (!note) {
        showStatus('Note introuvable', 'error');
        return;
    }
    
    showStatus(`Traitement de la commande: "${command}"...`, 'processing');
    
    try {
        // Call the backend API to process the command
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: command })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update the note with the returned content
        if (result.updated_content !== undefined) {
            // Find the note in our local array and update it
            const noteIndex = notes.findIndex(n => n.id === noteId);
            if (noteIndex !== -1) {
                notes[noteIndex].content = result.updated_content;
                // Note: We are not updating title or aiSuggestions from the backend for simplicity
                // In a more advanced version, we would update those too
            }
        }
        
        // Save and update UI
        await saveNotes();
        updateUI();
        
        // Show suggestions if any
        if (result.suggestions && result.suggestions.length > 0) {
            // We could show these in a modal or temporary UI, but for now we'll just log them
            console.log('AI Suggestions:', result.suggestions);
            // Optionally, show a temporary status with the first suggestion
            if (result.suggestions[0]) {
                showStatus(`Suggestion: ${result.suggestions[0]}`, 'processing');
                setTimeout(() => {
                    // After showing suggestion, go back to normal status
                    showStatus('Commande exécutée avec succès !', 'processing');
                }, 2000);
            }
        } else {
            showStatus('Commande exécutée avec succès !', 'processing');
        }
        
        setTimeout(() => {
            hideStatus();
        }, 1500);
    } catch (error) {
        console.error('Error processing AI command:', error);
        showStatus(`Erreur lors du traitement: ${error.message}`, 'error');
        setTimeout(() => {
            hideStatus();
        }, 2000);
    }
}

// Handle price-related commands
async function handlePriceCommand(note, command) {
    // In a real implementation, this would use AI to extract product info and add prices
    // For demo, we'll simulate the behavior
    
    showStatus('Analyse de la demande de prix...', 'processing');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the command is clear enough
    if (command.toLowerCase().includes('produit d\'hygiène') || 
        command.toLowerCase().includes('hygiène produit') ||
        command.toLowerCase().includes('produits d\'hygiène')) {
        // Clear enough to proceed
        const updatedContent = note.content + '\n\n[MISE À JOUR PRIX]\n' +
            '- Savon: 2,50€\n' +
            '- Shampooing: 4,80€\n' +
            '- Dentifrice: 3,20€\n' +
            '- Déodorant: 3,90€\n' +
            '- Papier toilette: 2,80€\n' +
            '*Prix indicatifs basée sur la moyenne du marché*';
        
        return {
            content: updatedContent,
            aiSuggestions: [
                "Vérifiez les prix actuels en magasin pour plus de précision",
                "Considérez les marques génériques pour économiser",
                "Regardez les promotions en cours"
            ]
        };
    } else {
        // Command is unclear, ask for clarification
        return {
            content: note.content,
            aiSuggestions: [
                "Pour ajouter des prix, pourriez-vous préciser :",
                "1. Quels types de produits d'hygiène exactement ?",
                "2. Voulez-vous des prix spécifiques ou des fourchettes ?",
                "3. Souhaitez-vous inclure des liens vers des produits en ligne ?"
            ]
        };
    }
}

// Handle detail/elaboration commands
async function handleDetailCommand(note, command) {
    showStatus('Développement de l\'idée en cours...', 'processing');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const updatedContent = note.content + '\n\n[DÉVELOPPEMENT DÉTAILLÉ]\n' +
        'Après analyse approfondie, voici les points clés à considérer :\n' +
        '1. Aspects techniques à examiner\n' +
        '2. Implications pratiques et opérationnelles\n' +
        '3. Ressources nécessaires et estimations de coût\n' +
        '4. Calendrier proposé pour la mise en œuvre\n' +
        '5. Risques potentiels et stratégies d\'atténuation\n' +
        '\n*Cette analyse a été générée par l\'IA en fonction du contexte de votre note*';
    
    return {
        content: updatedContent,
        aiSuggestions: [
            "Souhaitez-vous que je développe un point spécifique en particulier ?",
            "Voulez-vous un plan d'action étape par étape ?",
            "Avez-vous besoin d'une évaluation des risques plus détaillée ?"
        ]
    };
}

// Handle search/research commands
async function handleSearchCommand(note, command) {
    showStatus('Recherche d\'informations en cours...', 'processing');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedContent = note.content + '\n\n[INFORMATIONS COMPLÉMENTAIRES]\n' +
        'Selon les dernières données disponibles :\n' +
        '- Tendances du marché actuelles\n' +
        '- Statistiques récentes pertinentes\n' +
        '- Études de cas similaires\n' +
        '- Ressources recommandées pour approfondir\n' +
        '- Experts ou références à consulter\n' +
        '\n*Ces informations sont fournies à titre indicatif et doivent être vérifiées*';
    
    return {
        content: updatedContent,
        aiSuggestions: [
            "Souhaitez-vous que je me concentre sur un aspect particulier ?",
            "Avez-vous besoin de sources plus spécifiques ou académiques ?",
            "Voulez-vous une analyse comparative avec des solutions alternatives ?"
        ]
    };
}

// Handle generic AI commands
async function handleGenericCommand(note, command) {
    showStatus('Traitement de la commande générique...', 'processing');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple response based on command keywords
    let suggestionText = '';
    if (command.toLowerCase().includes('améliore') || command.toLowerCase().includes('ameliorate')) {
        suggestionText = 'Voici quelques suggestions pour améliorer votre note :\n' +
            '1. Clarifier les points principaux\n' +
            '2. Ajouter des exemples concrets\n' +
            '3. Structurer avec des sous-sections\n' +
            '4. Inclure une conclusion ou un appel à l\'action';
    } else if (command.toLowerCase().includes('organise') || command.toLowerCase().includes('organize')) {
        suggestionText = 'Pour mieux organiser votre note :\n' +
            '1. Utilisez des titres et sous-titres clairs\n' +
            '2. Groupez les idées liées\n' +
            '3. Créez une hiérarchie logique\n' +
            '4. Ajoutez une table des matières si longue';
    } else {
        suggestionText = 'Commande reçue : "' + command + '"\n' +
            'L\'IA a analysé votre demande et voici ses suggestions :\n' +
            '1. Précisez davantage ce que vous souhaitez accomplir\n' +
            '2. Donnez plus de contexte sur l\'objectif final\n' +
            '3. Specifiez le niveau de détail souhaité\n' +
            '4. Indiquez si vous voulez des exemples ou des données spécifiques';
    }
    
    return {
        content: note.content,
        aiSuggestions: suggestionText.split('\n').filter(line => line.trim() !== '')
    };
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
    
    // Add event listeners for note selection
    const noteItems = container.querySelectorAll('.note-item');
    noteItems.forEach(item => {
        item.addEventListener('click', () => {
            // Deselect all items
            container.querySelectorAll('.note-item').forEach(i => i.classList.remove('selected'));
            // Select this item
            item.classList.add('selected');
            // Update selectedNoteId
            selectedNoteId = item.getAttribute('data-note-id');
        });
    });
    
    // Add event listeners to command inputs and buttons
    const commandInputs = container.querySelectorAll('.command-input');
    const commandButtons = container.querySelectorAll('.command-btn');
    
    commandInputs.forEach((input, index) => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                commandButtons[index].click();
            }
        });
    });
    
    commandButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const input = commandInputs[index];
            const noteElement = button.closest('.note-item');
            const noteId = noteElement.getAttribute('data-note-id');
            const command = input.value.trim();
            
            if (command) {
                processAICommand(noteId, command);
                input.value = ''; // Clear input after processing
            }
        });
    });
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
        <div class="note-item" data-note-id="${note.id}">
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
            <div class="note-tags">
                ${note.tags && note.tags.length > 0 ? `
                    <div class="tags-container">
                        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="note-commands">
                <input type="text" placeholder="Commande pour l'IA (ex: ajoute les prix, détailler l'idée)..." class="command-input" />
                <button class="btn btn-sm btn-outline command-btn">Exécuter</button>
            </div>
        </div>
    `;
}

// Initialize tag input functionality
function initializeTagInput() {
    const tagInput = document.getElementById('tagInput');
    const addTagBtn = document.getElementById('addTagBtn');
    
    if (!tagInput || !addTagBtn) return;
    
    addTagBtn.addEventListener('click', () => {
        const tag = tagInput.value.trim();
        if (tag) {
            addTagToSelectedNote(tag);
            tagInput.value = '';
        }
    });
    
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const tag = tagInput.value.trim();
            if (tag) {
                addTagToSelectedNote(tag);
                tagInput.value = '';
            }
        }
    });
}

// Add tag to currently selected note
function addTagToSelectedNote(tag) {
    if (!selectedNoteId) {
        showStatus('Veuillez sélectionner une note d\'abord', 'processing');
        setTimeout(() => hideStatus(), 1500);
        return;
    }
    
    const noteIndex = notes.findIndex(n => n.id === selectedNoteId);
    if (noteIndex === -1) return;
    
    // Avoid duplicate tags
    if (!notes[noteIndex].tags.includes(tag)) {
        notes[noteIndex].tags.push(tag);
        saveNotes();
        updateUI();
        showStatus(`Tag "${tag}" ajouté`, 'processing');
        setTimeout(() => hideStatus(), 1500);
    }
}

// Initialize slash command functionality
function initializeSlashCommand() {
    document.addEventListener('keydown', (e) => {
        // Check if we're typing in a note content area (simplified)
        // In a real app, we'd target specific editable elements
        if (e.key === '/' && !isSlashMenuOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            openSlashMenu();
        }
        // Escape to close menu
        if (e.key === 'Escape' && isSlashMenuOpen) {
            closeSlashMenu();
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isSlashMenuOpen && !slashMenuElement.contains(e.target)) {
            closeSlashMenu();
        }
    });
}

// Open slash command menu
function openSlashMenu() {
    isSlashMenuOpen = true;
    
    // Create menu element if not exists
    if (!slashMenuElement) {
        slashMenuElement = document.createElement('div');
        slashMenuElement.className = 'slash-menu';
        slashMenuElement.innerHTML = `
            <div class="slash-menu-header">Commandes rapides (/)</div>
            <div class="slash-menu-items">
                <div class="slash-menu-item" data-command="/prix">Ajouter les prix</div>
                <div class="slash-menu-item" data-command="/detail">Développer l'idée</div>
                <div class="slash-menu-item" data-command="/cherche">Rechercher des infos</div>
                <div class="slash-menu-item" data-command="/améliore">Améliorer la note</div>
                <div class="slash-menu-item" data-command="/organise">Organiser la note</div>
            </div>
        `;
        
        // Style the menu
        slashMenuElement.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        document.body.appendChild(slashMenuElement);
        
        // Add event listeners to menu items
        const items = slashMenuElement.querySelectorAll('.slash-menu-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const command = item.getAttribute('data-command');
                if (selectedNoteId) {
                    // Remove the slash and execute command
                    const cleanCommand = command.substring(1);
                    processAICommand(selectedNoteId, cleanCommand);
                }
                closeSlashMenu();
            });
            
            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f8f9fa';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
        });
    } else {
        slashMenuElement.style.display = 'block';
    }
    
    // Position near cursor (simplified - in real app would be at cursor position)
    slashMenuElement.style.top = '100px';
    slashMenuElement.style.left = '50%';
    slashMenuElement.style.transform = 'translateX(-50%)';
}

// Close slash command menu
function closeSlashMenu() {
    isSlashMenuOpen = false;
    if (slashMenuElement) {
        slashMenuElement.style.display = 'none';
    }
}