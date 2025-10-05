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
> Contexte projet : Cdiscount

> ✅ **Succès**
>
> Faille confirmée

> ❌ **Erreur**
>
> WAF détecté

> ⚠️ **Attention**
>
> Rate limiting actif

> 💡 **Conseil**
>
> Teste en sandbox

### 2. Requêtes HTTP

\`\`\`http
POST /checkout HTTP/1.1
Host: cdiscount.com

{"quantity": -1}
\`\`\`

### 3. Code

\`\`\`bash
curl -X POST https://api.com/test
\`\`\`

### 4. Tableaux

| Test | Résultat |
|------|----------|
| Prix négatif | ✅ Succès |
| SQL injection | ❌ Bloqué |

### 5. Formatage

- **Gras** : \`**texte**\`
- *Italique* : \`*texte*\`
- \`Code\` : \`\\\`code\\\`\`

**EXEMPLE COMPLET :**

# Test Cdiscount

> ℹ️ **Contexte**
>
> Cible: www.cdiscount.com
> Type: Business Logic

## Payload

\`\`\`http
POST /checkout HTTP/1.1

{"quantity": -1}
\`\`\`

## Résultat

> ✅ **Succès**
>
> Backend accepte quantité négative
> Impact: CRITIQUE

| Param | Test | Résultat |
|-------|------|----------|
| quantity | -1 | ✅ OK |

**Utilise TOUJOURS ce format simple - Compatible streaming.**
`
