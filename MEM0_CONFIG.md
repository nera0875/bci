# Configuration Mem0.ai

## Variables d'environnement nécessaires

Ajouter dans votre fichier `.env.local` :

```env
# Mem0.ai (pour la mémoire intelligente)
MEM0_API_KEY=your_mem0_api_key_here
MEM0_ORG_ID=your_mem0_org_id_optional
```

## Obtenir une clé API Mem0

1. Créer un compte sur [Mem0.ai](https://app.mem0.ai)
2. Aller dans Settings → API Keys
3. Créer une nouvelle clé API
4. Copier la clé et l'ajouter dans `.env.local`

## Architecture hybride

Le système utilise maintenant une approche hybride :

- **Supabase** : Stockage de la structure hiérarchique et interface visuelle
- **Mem0** : Recherche intelligente par vecteurs et extraction automatique des informations

## Fonctionnalités

- Recherche sémantique améliorée
- Extraction automatique des entités importantes
- Graphe de relations entre les informations
- Synchronisation automatique Supabase ↔ Mem0
- Fallback sur Supabase si Mem0 n'est pas configuré

## Test

Pour tester l'intégration :

1. Ajouter votre clé API Mem0
2. Relancer le serveur : `npm run dev`
3. Vérifier dans la console que "MemoryBridge initialized with Mem0" apparaît
4. Les recherches utiliseront maintenant la recherche hybride