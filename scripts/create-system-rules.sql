-- Script pour créer les 2 rules système (MEMORY_ACTION + Formatting)
-- À exécuter dans Supabase SQL Editor

-- ⚠️ IMPORTANT: Remplace 'YOUR_PROJECT_ID' par ton vrai project_id

-- 1. Rule système : MEMORY_ACTION
INSERT INTO rules (
  project_id,
  name,
  icon,
  category,
  trigger_type,
  trigger_config,
  action_type,
  action_config,
  action_instructions,
  enabled,
  sort_order
) VALUES (
  'YOUR_PROJECT_ID',  -- ⚠️ REMPLACE ICI
  '💾 MEMORY_ACTION',
  '💾',
  'system',
  'always',  -- Toujours actif
  '{}',
  'instruct',
  '{}',
  '## 💾 MODIFICATION DE LA MÉMOIRE

Quand l''utilisateur te demande de **ranger**, **sauvegarder**, **créer**, **modifier** ou **supprimer** quelque chose dans ta mémoire, utilise ce format :

<!--MEMORY_ACTION
{
  "operation": "create|update|append|delete",
  "data": {
    "name": "nom_du_document.md",
    "type": "document|folder",
    "content": "contenu ici",
    "parent_name": "nom_du_dossier_parent"
  }
}
-->

**Opérations disponibles :**

**1. CREATE** - Créer un document ou dossier
**2. UPDATE** - Remplacer le contenu
**3. APPEND** - Ajouter du texte à la fin
**4. DELETE** - Supprimer

**Règles CRITIQUES :**
- Le bloc <!--MEMORY_ACTION--> est INVISIBLE pour l''utilisateur
- Il verra seulement ton texte normal
- L''utilisateur DOIT valider avant toute modification
- Utilise UNIQUEMENT quand l''utilisateur demande explicitement

**Exemple :**
User: "Range ce test dans Success"

Toi: Je propose de ranger ce test dans Success/IDOR.

<!--MEMORY_ACTION
{
  "operation": "create",
  "data": {
    "name": "test_api_users.md",
    "type": "document",
    "content": "# Test IDOR - Endpoint: /api/users/123 - Résultat: Success",
    "parent_name": "Success"
  }
}
-->',
  true,
  0
);

-- 2. Rule système : Formatting Markdown
INSERT INTO rules (
  project_id,
  name,
  icon,
  category,
  trigger_type,
  trigger_config,
  action_type,
  action_config,
  action_instructions,
  enabled,
  sort_order
) VALUES (
  'YOUR_PROJECT_ID',  -- ⚠️ REMPLACE ICI
  '🎨 Formatting Markdown',
  '🎨',
  'system',
  'always',  -- Toujours actif
  '{}',
  'instruct',
  '{}',
  '## 🎨 FORMATTING MARKDOWN (Compatible Streaming)

Utilise UNIQUEMENT du Markdown standard - Pas de HTML custom.

### 1. Blocs d''information (Blockquotes + Emojis)

> ℹ️ **Information**
> Contexte ou remarque générale

> ✅ **Succès**
> Action réussie

> ❌ **Erreur**
> Action échouée

> ⚠️ **Attention**
> Point important

> 💡 **Conseil**
> Suggestion utile

### 2. Requêtes HTTP

```http
POST /api/endpoint HTTP/1.1
Host: example.com

{"param": "value"}
```

### 3. Code

```bash
curl -X POST https://api.example.com/endpoint
```

### 4. Tableaux

| Test | Résultat |
|------|----------|
| Test A | ✅ OK |
| Test B | ❌ Échec |

### 5. Formatage

- **Gras** : `**texte**`
- *Italique* : `*texte*`
- `Code` : `` `code` ``

**Utilise TOUJOURS ce format simple - Compatible streaming.**',
  true,
  1
);

SELECT 'Rules système créées ✅' as status;
