# Voice Note AI - Prise de note vocale avec intelligence artificielle

Une application web innovante qui permet de prendre des notes vocales et d'utiliser des agents IA pour analyser, structurer et améliorer vos idées, avec des fonctionnalités inspirées de Notion.

## Fonctionnalités

- **Reconnaissance vocale** : Convertit votre parole en texte en temps réel
- **Écoute continue** : Mode d'écoute active qui crée des notes automatiquement lors des pauses dans la parole (2 secondes de silence) pour une utilisation mains-libres sans gaspiller des crédits IA inutilement
- **IA multi-agents** : Analyse vos notes avec des agents spécialisés (Chercheur, Planificateur, Critique, Créateur, Exécuteur)
- **Suggestions contextuelles** : Propose des améliorations selon le type de projet (vidéo YouTube, jeu vidéo, business, créatif, général)
- **Système de tags** : Ajoutez des tags à vos notes pour une organisation et un filtrage faciles
- **Commandes slash (/)** : Accédez rapidement à des actions IA courantes en tapant '/' dans une note (ex: /prix pour ajouter des prix, /detail pour développer une idée)
- **Barre de commandes IA** : Tapez des commandes en langage naturel comme "ajoute les prix des produits d'hygiène" ou "détaille cette idée" pour que l'IA exécute ou demande des précisions
- **Propriétés des notes** : Chaque note peut avoir des tags et une relation hiérarchique (à venir dans les futures versions)
- **Interface intuitive** : Design moderne et responsive inspiré par les meilleures pratiques d'UI/UX
- **Sauvegarde locale** : Vos notes sont sauvegardées dans le navigateur
- **Déploiement facile** : Peut être hébergé sur GitHub Pages, Hugging Face Spaces, ou tout serveur web statique

## Prérequis

- Un navigateur moderne (Chrome, Edge, Safari, Firefox) avec support de la reconnaissance vocale
- Connexion internet pour la reconnaissance vocale initiale (utilise l'API Web Speech du navigateur)
- Pour les fonctionnalités IA réelles : Une clé API OpenAI

## Installation locale

### Mode Démo (Fonctionnalités simulées)
1. Clonez ou téléchargez ce dépôt
2. Ouvrez le dossier `voice-note-app/frontend`
3. Double-cliquez sur `index.html` ou ouvrez-le avec votre navigateur préféré (Chrome ou Edge recommandés)

### Avec IA réelle (nécessite une clé API OpenAI)
1. Obtenez une clé API OpenAI sur https://platform.openai.com/api-keys
2. Clonez ce dépôt
3. Dans le dossier `backend`, créez un fichier `.env` avec votre clé :
   ```
   OPENAI_API_KEY=votre_clé_ici
   ```
4. Installez les dépendances : `pip install -r requirements.txt`
5. Lancez le serveur backend : `python main.py` (devrait afficher "Uvicorn running on http://0.0.0.0:8000")
6. Ouvrez `frontend/index.html` dans votre navigateur
7. L'application se connectera automatiquement au backend pour utiliser de vrais modèles d'IA

## Utilisation

### Enregistrement de notes vocales
1. Cliquez sur **"Démarrer l'enregistrement"** (icône de micro)
2. Parlez clairement dans votre microphone
3. Cliquez sur **"Arrêter l'enregistrement"** (icône de stop) lorsque vous avez terminé
   - Ou activez le mode **"Écoute continue"** (icône de rafraîchissement) pour une écoute active qui crée des notes automatiquement lors des pauses dans votre parole

### Utilisation de l'IA avec vos notes

#### Via la barre de commandes
Chaque note dispose d'une barre de commandes où vous pouvez taper des instructions en langage naturel :
- Exemples : "ajoute les prix des produits d'hygiène", "détaille cette idée pour une présentation", "cherche des informations sur les tendances du marché"
- L'IA exécutera la demande si elle est claire, ou vous demandera des précisions si la requête est ambiguë

#### Via les commandes slash (/)
Tapez '/' dans n'importe quelle note pour afficher un menu de commandes rapides :
- `/prix` : Ajoute des prix estimés pour les produits mentionnés
- `/detail` : Développe et approfondit l'idée principale de la note
- `/cherche` : Recherche et ajoute des informations complémentaires pertinentes
- `/améliore` : Suggestion d'améliorations générales pour la note
- `/organise` : Conseils pour mieux organiser et structurer la note

#### Via l'analyse multi-agents
1. Après avoir enregistré une note, cliquez sur le bouton **"Analyser avec les agents"** (icône de robot)
2. Attendez l'analyse complète (affiche "Analyse en cours avec les agents IA...")
3. Une fenêtre modale apparaît montrant :
   - Les suggestions de chacun des 5 agents IA spécialisés (Chercheur, Planificateur, Critique, Créateur, Exécuteur)
   - Une version améliorée de votre note incorporant toutes les suggestions
4. Vous pouvez soit :
   - Cliquer sur "Appliquer les suggestions" pour mettre à jour votre note avec le contenu amélioré
   - Cliquer sur "Fermer" pour fermer la fenêtre sans modifications

### Écoute de vos notes
1. Cliquez sur le bouton **"Écouter la note"** (icône de volume) sur n'importe quelle note
2. L'IA lira votre note à haute voix en utilisant la synthèse vocale
3. Vous pouvez mettre en pause/arrêter en utilisant les contrôles audio de votre navigateur

### Gestion des tags
1. Sélectionnez une note en cliquant dessus (elle sera mise en surbrillance)
2. Dans la section "Contrôles vocaux", utilisez le champ de saisie "Ajouter un tag..." pour taper un tag
3. Appuyez sur Entrée ou cliquez sur "Ajouter Tag" pour ajouter le tag à la note sélectionnée
4. Les tags apparaissent sous le contenu de la note et peuvent être utilisés pour filtrer et organiser vos idées

### Gestion des notes
- Pour supprimer toutes les notes : Cliquez sur "Effacer les notes" (icône de corbeille) et confirmez
- Les notes sont automatiquement sauvegardées dans le localStorage de votre navigateur
- Pour un stockage persistant entre appareils, envisagez de déployer le backend sur un service cloud

## Déploiement

### Frontend (Site statique)
- GitHub Pages : Poussez le dossier `frontend` vers un dépôt et activez GitHub Pages
- Netlify : Glissez-déposez le dossier `frontend`
- Vercel : Importez le dossier `frontend` comme projet
- Tout hébergeur de sites web statiques

### Backend (API)
- Render.com : Créez un nouveau service web, connectez votre dépôt, définissez la commande de build sur `pip install -r requirements.txt` et la commande de démarrage sur `python main.py`
- Railway : Similaire à Render
- Fly.io : Déployez en tant que conteneur Docker
- N'oubliez pas de définir la variable d'environnement `OPENAI_API_KEY` sur votre plateforme de déploiement

## Fonctionnalités IA réelles (quand connecté à un backend avec clé OpenAI)

### Transcription
- Utilise le modèle **OpenAI Whisper** pour une précision maximale dans la conversion de la parole en texte

### Analyse et suggestions
- Utilise le modèle **GPT-4o-mini** pour une compréhension contextuelle riche et des suggestions pertinentes

### Système multi-agents
Cinq agents IA spécialisés travaillent en parallèle :
- **Chercheur** : Trouve des informations pertinentes, des données, des études de cas et des références
- **Planificateur** : Structure les idées, crée des étapes claires et des plans d'action
- **Critique** : Identifie les points faibles, les lacunes et les risques potentiels
- **Créateur** : Génère des idées originales, des variantes créatives et des approches inédites
- **Exécuteur** : Transforme les idées en actions concrètes, des étapes réalisables et des plans pratiques

### Traitement de commandes
L'IA comprend les commandes en langage naturel et peut :
- Extraire et ajouter des informations de prix pour des produits mentionnés
- Développer et approfondir des idées avec des détails techniques, opérationnels et financiers
- Rechercher et ajouter des informations complémentaires pertinentes
- Fournir des suggestions d'amélioration basées sur les meilleures pratiques
- Conseiller pour une meilleure organisation et structure des notes
- Demander des précisions lorsque la demande est ambiguë ou incomplète

### Synthèse vocale
- Utilise le modèle **OpenAI TTS** pour convertir le contenu des notes en parole naturelle

## Confidentialité des données
- Les enregistrements vocaux sont traités en temps réel et ne sont pas stockés
- Les notes sont enregistrées uniquement dans le localStorage de votre navigateur (sauf si vous déployez le backend)
- Votre clé API OpenAI n'est utilisée que sur votre serveur backend (si vous l'hébergez vous-même)

## Limitations actuelles
- La reconnaissance vocale dépend du navigateur (meilleure performance sur Chrome/Edge)
- En mode démo, les suggestions d'IA sont simulées (pour tester l'interface sans clé API)
- Le stockage est actuellement limité au localStorage (pas de synchronisation cloud sans backend déployé)
- Le système de hiérarchie de pages (pages imbriquées comme dans Notion) est prévu pour une future version

## Améliorations futures prévues
- Synchronisation cloud avec authentification utilisateur (Firebase, Supabase, etc.)
- Export/import des notes en différents formats (PDF, TXT, JSON, Markdown)
- Système complet de pages imbriquées pour créer des wikis et des bases de connaissances
- Fonctionnalités de base de données connectées (tableaux, Kanban, calendrier, galerie, timeline)
- Collaboration en temps réel avec commentaires et mentions
- Intégration de modèles d'IA plus avancés et personnalisables
- Modèles prêts à l'emploi pour différents types de projets (réunions, planification de projets, listes de tâches, etc.)
- Intégration avec des outils de productivité populaires (Notion, Trello, Google Workspace, etc.)

## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur le dépôt GitHub.