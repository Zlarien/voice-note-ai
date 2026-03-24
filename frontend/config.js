// Configuration de l'application Voice Note AI
const config = {
    // API Keys - À configurer dans un fichier .env local ou via l'interface d'administration
    // Pour des raisons de sécurité, ces clés ne doivent jamais être committées dans le repo
    openaiApiKey: "", // À remplir par l'utilisateur ou chargé depuis un stockage sécurisé
    
    // Modèles IA à utiliser
    aiModels: {
        transcription: "whisper-1", // Pour la transcription vocale améliorée
        textGeneration: "gpt-4o-mini", // Pour l'analyse et les suggestions
        embedding: "text-embedding-3-small" // Pour la recherche sémantique
    },
    
    // Paramètres de l'application
    app: {
        maxNoteLength: 5000,
        autoSaveInterval: 30000, // 30 secondes
        voiceRecognitionLang: "fr-FR",
        agentCount: 5
    }
};