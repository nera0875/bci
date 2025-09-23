# BCI Tool v2 - Tasks

## 🎯 Objectif Principal
Créer un système de mémoire modulaire avec RAG pour l'IA qui peut s'auto-modifier via le chat.

## ✅ Tâches Complétées
- [x] Analyser la structure existante du projet
- [x] Vérifier les tables Supabase existantes (7 tables trouvées)
- [x] Inventorier les composants Memory existants
- [x] Créer la table memory_chunks pour le système RAG
- [x] Implémenter le système de chunking intelligent
- [x] Créer API pour modifications partielles
- [x] Simplifier l'interface Memory (gardé seulement folder + document)

## 🚧 En Cours
- [ ] Tester le système complet

## 📝 À Faire

### 1. Tests & Validation
- [ ] Tester création de dossiers/documents via l'UI
- [ ] Vérifier que l'IA peut modifier sa mémoire invisiblement
- [ ] Tester les modifications partielles de documents
- [ ] Vérifier la recherche par similarité

### 2. Optimisations
- [ ] Cache des 10 derniers chunks
- [ ] Lazy loading des embeddings
- [ ] Compression des vieux chunks
- [ ] Background sync avec Supabase

## 🐛 Bugs à Corriger
- [ ] Erreur 401 sur OpenAI embeddings (clé manquante - besoin de configurer OPENAI_API_KEY)
- [ ] CORS warnings (partiellement corrigé avec next.config.mjs)

## 📊 Métriques Cibles
- Contexte max : 4000 tokens
- Chunks par recherche : 5-10
- Latence : <200ms
- Taille chunk : ~500 tokens
- Overlap : 50 tokens

## 🎉 Accomplissements

### Système RAG Implémenté
- **ChunkingService** : Découpe intelligente avec sections et overlap
- **memory_chunks** : Table Supabase avec pgvector pour embeddings
- **API /api/memory/chunk** : CRUD complet pour chunks
- **Modifications partielles** : Support des content-id pour update ciblé

### Interface Simplifiée
- **MemorySidebar** : Seulement folders + documents (retiré widget, pattern, exploit, metric)
- **Double-clic** : Ouvre l'éditeur complet MemoryEditor
- **Inline edit** : Édition rapide du contenu

### IA Améliorée
- **Commandes invisibles** : Via HTML comments <!--MEMORY_ACTION-->
- **RAG intégré** : searchSimilarChunks dans Claude API
- **System prompt** : Instructions pour auto-modification mémoire

## 🔧 Stack Technique
- **Frontend**: Next.js 15.5.3 + TypeScript
- **Editor**: Monaco Editor + Markdown
- **Database**: Supabase + pgvector
- **AI**: Claude API + OpenAI embeddings
- **UI**: Framer Motion + Radix UI

## 📝 Notes
- La table memory_nodes existe déjà avec colonne embedding
- 7 tables dans Supabase : projects, memory_nodes, chat_messages, rules, requests, vulnerabilities, attack_patterns
- Composants Memory existants : MemorySidebar, MemoryEditor, AdvancedMemoryEditor, TableEditor, DynamicWidget
- Nouveau système de chunking avec memory_chunks et memory_chunks_cache