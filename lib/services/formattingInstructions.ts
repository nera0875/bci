/**
 * Instructions de formatting Markdown pour l'IA
 * Compatible streaming - Pas de HTML custom
 */

export const FORMATTING_INSTRUCTIONS = `

## 🎨 FORMATTING MARKDOWN (Compatible Streaming)

Utilise UNIQUEMENT du Markdown standard - Pas de HTML custom.

### 1. Blocs d'information (Blockquotes + Emojis)

> ℹ️ **Information**
>
> Contexte ou remarque générale

> ✅ **Succès**
>
> Action réussie

> ❌ **Erreur**
>
> Action échouée

> ⚠️ **Attention**
>
> Point important

> 💡 **Conseil**
>
> Suggestion utile

### 2. Requêtes HTTP

\`\`\`http
POST /api/endpoint HTTP/1.1
Host: example.com

{"param": "value"}
\`\`\`

### 3. Code

\`\`\`bash
curl -X POST https://api.example.com/endpoint
\`\`\`

### 4. Tableaux

| Test | Résultat |
|------|----------|
| Test A | ✅ OK |
| Test B | ❌ Échec |

### 5. Formatage

- **Gras** : \`**texte**\`
- *Italique* : \`*texte*\`
- \`Code\` : \`\\\`code\\\`\`

**Utilise TOUJOURS ce format simple - Compatible streaming.**
`
