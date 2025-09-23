# Setup Conversation System

## Manual Setup Instructions

Pour activer le système de conversation optimisé avec cache et déduplication, exécutez le SQL suivant dans votre Supabase SQL Editor:

1. Allez sur https://app.supabase.com/project/clcpszhztwfhnvirexao/sql/new
2. Copiez et collez tout le contenu du fichier `/lib/sql/conversations_system.sql`
3. Cliquez sur "Run"

## Ce que le système fait:

### 🚀 Optimisations Automatiques:

1. **Cache de messages identiques** (💰 Économie de tokens)
   - Questions identiques = réponse instantanée depuis le cache
   - Hash SHA256 pour déduplication parfaite

2. **Recherche par similarité**
   - Retrouve les messages similaires via embeddings
   - Contexte enrichi avec les échanges pertinents passés

3. **Résumés automatiques**
   - Après 30 messages, génère un résumé de la conversation
   - Garde le contexte essentiel sans surcharger Claude

4. **Fenêtre glissante intelligente**
   - Garde les 10 derniers messages + messages similaires
   - Combine avec le résumé pour un contexte optimal

## Tables créées:

- `conversations` - Sessions de chat
- `messages` - Messages avec embeddings et hash
- `message_cache` - Cache des réponses pour messages identiques
- `search_similar_messages()` - Fonction de recherche par similarité

## Statut actuel:

✅ ConversationManager implémenté dans `/lib/services/conversation.ts`
✅ Intégré dans ChatStream component
✅ API route mise à jour avec cache et contexte optimisé
⏳ Tables à créer dans Supabase (suivre les instructions ci-dessus)

## Comment ça marche:

1. Chaque message est hashé (SHA256) pour détecter les doublons
2. Si message identique trouvé → réponse depuis le cache (0 tokens!)
3. Sinon → recherche messages similaires par embedding
4. Construction du contexte optimisé avec:
   - Messages récents (fenêtre de 10)
   - Messages similaires trouvés
   - Résumé si conversation longue
5. Sauvegarde de la réponse en cache pour usage futur

C'est le même système qu'utilisent ChatGPT et Claude pour maintenir de longues conversations efficacement!