# Instructions pour corriger les problèmes de conversations

## Problèmes identifiés et corrigés

### 1. ✅ Erreur d'embeddings (401 Unauthorized)
**Problème**: L'API d'embeddings utilisait l'IP externe (84.247.131.60) au lieu de localhost
**Solution**: Modifié `/lib/services/embeddings.ts` pour utiliser `window.location.origin` côté client

### 2. 🔧 Table message_cache manquante
**Problème**: La table `message_cache` n'existe pas, causant des erreurs 406
**Solution**: Script SQL créé pour créer la table avec les bons index et permissions

### 3. 🔧 Messages qui ne s'affichent pas dans les nouvelles conversations
**Problème**: Le `message_count` n'est pas mis à jour, donc les conversations restent à 0 messages
**Solution**: Créé un trigger PostgreSQL pour auto-incrémenter `message_count` à chaque nouveau message

## Actions requises

### Exécuter le script SQL dans Supabase

1. Aller sur https://supabase.com/dashboard/project/ohmrsgxfjcitgahkrkkf/sql
2. Copier le contenu du fichier `/home/pilote/projets/bci/fix-database.sql`
3. L'exécuter dans l'éditeur SQL de Supabase

Le script va :
- ✅ Créer la table `message_cache` pour le cache des réponses
- ✅ Ajouter la colonne `conversation_id` à `chat_messages` si manquante
- ✅ Créer un trigger pour mettre à jour automatiquement `message_count`
- ✅ Corriger les compteurs existants
- ✅ Nettoyer les vieilles conversations vides
- ✅ Ajouter les index nécessaires pour les performances
- ✅ Configurer les permissions RLS

## Vérification après application

Une fois le script exécuté :

1. **Créer une nouvelle conversation** devrait :
   - Créer une entrée dans `conversations` avec `message_count = 0`
   - Quand on envoie le premier message, `message_count` passe à 1
   - La conversation apparaît dans la liste

2. **Les embeddings** devraient :
   - Utiliser l'URL correcte (localhost:3001 ou origin)
   - Ne plus donner d'erreur 401

3. **Le cache de messages** devrait :
   - Stocker les paires question/réponse identiques
   - Économiser des tokens sur les questions répétées

## Test rapide

```bash
# Relancer l'app
cd /home/pilote/projets/bci
npm run dev
```

Puis :
1. Cliquer sur "Nouvelle conversation"
2. Écrire un message
3. Vérifier que le message s'affiche
4. Vérifier que la conversation apparaît dans la liste

## État actuel du système

### Architecture de mémoire

```
Supabase (PostgreSQL)
├── conversations       # Liste des conversations
├── chat_messages      # Messages avec conversation_id
├── messages           # Messages avec embeddings (table séparée)
├── message_cache      # Cache pour économiser les tokens
└── memory_nodes       # Fichiers virtuels de mémoire
```

### Flow de conversation

1. **Nouvelle conversation**:
   - ChatProfessional crée la conversation au premier message
   - ConversationManager gère le contexte optimisé
   - Messages sauvés dans `chat_messages` ET `messages`

2. **Contexte optimisé**:
   - 10 derniers messages (fenêtre glissante)
   - 3 messages similaires par embedding
   - Cache pour questions identiques
   - Résumé si > 30 messages

3. **Économie de tokens**:
   - Hash SHA256 pour déduplication
   - Cache des réponses identiques
   - Recherche par similarité vectorielle