# Voice Note AI - Prise de note vocale avec intelligence artificielle

Une application web innovante qui permet de prendre des notes vocales et d'utiliser des agents IA pour analyser, structurer et améliorer vos idées.

## Fonctionnalités

- **Reconnaissance vocale** : Convertit votre parole en texte en temps réel
- **IA multi-agents** : Analyse vos notes avec des agents spécialisés (Chercheur, Planificateur, Critique, Créateur, Exécuteur)
- **Suggestions contextuelles** : Propose des améliorations selon le type de projet (vidéo YouTube, jeu vidéo, business, créatif, général)
- **Interface intuitive** : Design moderne et responsive
- **Sauvegarde locale** : Vos notes sont sauvegardées dans le navigateur
- **Déploiement facile** : Peut être hébergé sur GitHub Pages, Hugging Face Spaces, ou tout serveur web statique

## Prérequis

- Un navigateur moderne (Chrome, Edge, Safari, Firefox) avec support de la reconnaissance vocale
- Connexion internet pour la reconnaissance vocale initiale (utilise l'API Web Speech du navigateur)

## Installation locale

1. Clonez ou téléchargez ce dépôt
2. Ouvrez le dossier `voice-note-app/frontend`
3. Double-cliquez sur `index.html` ou ouvrez-le avec votre navigateur préféré

## Utilisation

1. Cliquez sur **"Démarrer l'enregistrement"**
2. Parlez clairement dans votre microphone
3. Cliquez sur **"Arrêter l'enregistrement"** lorsque vous avez terminé
4. Sélectionnez le type de projet approprié dans le menu déroulant
5. Vos notes apparaîtront avec des suggestions d'IA générées automatiquement
6. Vous pouvez ajouter de nouvelles notes ou supprimer celles existantes

## Déploiement

### Sur GitHub Pages

1. Poussez le dossier `frontend` vers un dépôt GitHub
2. Dans les paramètres du dépôt, activez GitHub Pages sur la branche `main`
3. Votre application sera accessible à `https://username.github.io/repository-name/`

### Sur Hugging Face Spaces

1. Créez un nouvel espace Hugging Face
2. Choissez "Static HTML" comme SDK
3. Téléversez le contenu du dossier `frontend`
4. Votre espace sera automatiquement déployé

### Sur Netlify/Vercel

1. Connectez votre dépôt GitHub
2. Configurez le build pour servir le dossier `frontend`
3. Déployez avec les paramètres par défaut (pas de build nécessaire)

## Fonctionnalités IA

L'application simule un système d'agents IA qui travaillent ensemble :

- **Chercheur** : Trouve des informations pertinentes liées à votre sujet
- **Planificateur** : Organise et structure vos idées de manière logique
- **Critique** : Identifie les points d'amélioration et les faiblesses potentielles
- **Créateur** : Génère des propositions créatives et originales
- **Exécuteur** : Transforme les idées en actions concrètes et réalisables

## Personnalisation

Pour modifier les comportements de l'IA :

1. Éditez la fonction `getAISuggestions()` dans `index.html`
2. Ajustez les suggestions selon vos besoins spécifiques
3. Modifiez les types de projet dans le sélecteur si nécessaire

## Limitations actuelles

- La reconnaissance vocale dépend du navigateur (meilleure sur Chrome/Edge)
- Les suggestions d'IA sont actuellement simulées (pas de véritable modèle d'IA)
- Sauvegarde uniquement dans le navigateur (pas de synchronisation cloud)
- Pas de support pour l'import/export de notes (à venir dans les futures versions)

## Futures améliorations prévues

- Intégration d'un véritable modèle de langage (comme Whisper ou GPT)
- Synchronisation cloud avec authentification utilisateur
- Export/import des notes en différents formats (PDF, TXT, JSON)
- Mode hors ligne amélioré
- Personnalisation avancée des agents IA
- Intégration avec des outils de productivité (Notion, Trello, etc.)

## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur le dépôt GitHub.