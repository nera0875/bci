# HTTP Request Memory - Documentation Utilisateur

## Vue d'ensemble

Le système de mémoire supporte maintenant le stockage complet de requêtes HTTP issues de Burp Suite (ou autres outils de pentest). Cela permet de :

✅ **Stocker des requêtes complètes** : URL, headers, body, cookies
✅ **Affichage visuel moderne** : Syntax highlighting, accordéon, copy-paste
✅ **Intégration IA** : L'assistant peut analyser et suggérer des exploits
✅ **Catégorisation flexible** : Severity, technique, tags personnalisés

---

## 🚀 Comment l'utiliser

### 1. Créer un fact avec requête HTTP

**Option A : Via l'interface Memory**
1. Ouvrir **Intelligence → Memory → Facts**
2. Cliquer **"New Fact"**
3. Passer à l'onglet **"🌐 HTTP Request"**
4. Coller la requête Burp Suite complète (Ctrl+V)
5. Cliquer **"Parse Request"**
6. Vérifier l'aperçu, puis **"Use This Request"**
7. Retourner à l'onglet **"📝 Details"** pour ajouter description, severity, tags
8. **"Save Changes"**

**Option B : Directement dans le chat**
1. Coller la requête Burp dans le chat
2. L'IA la détecte et propose de créer un fact
3. Valider l'action mémoire proposée

---

### 2. Visualiser une requête HTTP

Quand vous ouvrez un fact avec requête HTTP :

- **Onglet "Details"** : Métadonnées (severity, technique, tags)
- **Onglet "HTTP Request"** ✅ : Affichage complet avec :
  - 🌐 **Overview** : URL, méthode, protocole
  - 📋 **Headers** : Tous les headers (copy-paste individuel)
  - 📦 **Body** : JSON formatté avec syntax highlighting
  - 🍪 **Cookies** : Parsed automatiquement
  - 📊 **Response** (optionnel) : Status, headers, body

**Fonctionnalités** :
- ✂️ Copy-paste sélectif (URL seule, headers, body, ou requête complète)
- 🔍 Détection automatique des infos sensibles (🔒 Auth Token, 🔑 Session ID, ⚠️ Password)
- 🎨 Color-coding des méthodes HTTP (GET=bleu, POST=vert, DELETE=rouge)

---

### 3. Format de la requête Burp Suite

Le parser supporte le format standard Burp Suite :

```http
POST /game/play HTTP/2
Host: demo-eu.mkc03xpj.xyz
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0
Accept: */*
Accept-Language: en-US,en;q=0.5
Content-Type: application/json
X-Session-Id: d1e41cc3-ddbb-42ea-b786-6febd27fbefc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{"game":"florida-man","provider":"avatarux","action":"main","complete":false,"asyncWin":false,"bet":1}
```

**Comment copier depuis Burp** :
1. **Burp Suite Proxy → HTTP History** : Right-click → "Copy to file" (ou sélectionner tout le Request tab)
2. Coller directement dans BCI

---

## 🤖 Intégration avec l'IA

### L'IA peut automatiquement :

1. **Détecter** les requêtes HTTP collées dans le chat
2. **Extraire** les informations clés :
   - Endpoint vulnérable
   - Technique d'attaque (BLV, IDOR, SQLi...)
   - Severity (basée sur l'impact)
   - Tags appropriés
3. **Proposer** des actions mémoire :
   ```json
   {
     "operation": "create_fact",
     "data": {
       "fact": "BLV trouvé: manipulation paramètre bet sur /game/play",
       "severity": "critical",
       "technique": "BLV",
       "tags": ["SPIN", "EXPLOIT"],
       "http_request": {...}
     }
   }
   ```
4. **Analyser** les requêtes existantes :
   - "Quelles vulnérabilités BLV as-tu trouvé ?"
   - "Montre-moi tous les endpoints /game/*"
   - "Génère un script Python pour exploiter cette vulnérabilité"

### API disponible pour l'IA

```typescript
// Récupérer toutes les requêtes HTTP
GET /api/memory/http-requests?projectId=xxx

// Filtrer par critères
POST /api/memory/http-requests/search
{
  "projectId": "xxx",
  "method": "POST",
  "host": "mkc03xpj.xyz",
  "technique": "BLV",
  "severity": "critical"
}
```

---

## 📊 Métadonnées disponibles

Pour chaque fact avec requête HTTP, vous pouvez définir :

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Description** | Résumé de la vulnérabilité | "BLV: Negative bet exploit" |
| **Severity** | Criticité | 🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low |
| **Technique** | Type d'attaque | BLV, IDOR, SQLi, Price Manipulation |
| **Category** | Catégorie custom | business_logic, auth, payment |
| **Tags** | Tags personnalisés | SPIN, STAKE, EXPLOIT, BOUNTY |

**Plus automatiquement détecté** :
- URL, method, protocol
- Headers (avec détection Authorization, Session, API keys)
- Body (JSON parsé)
- Cookies

---

## 🔐 Sécurité

Le système détecte et affiche les **informations sensibles** :

- 🔒 **Authorization** : Bearer tokens, Basic auth
- 🔑 **Session ID** : X-Session-Id, Cookie session
- 🔐 **API Keys** : X-API-Key, apikey headers
- ⚠️ **Passwords** : Paramètres password/passwd dans body

**Ces infos sont visibles uniquement par vous** (RLS activé sur memory_facts).

---

## 💡 Cas d'usage

### Pentest Business Logic

```
1. Intercepter requête POST /checkout avec Burp
2. Coller dans BCI Memory
3. L'IA suggère : "Tester price manipulation sur amount parameter"
4. Modifier amount=-100 dans le viewer
5. Copier la requête modifiée
6. Rejouer dans Burp Repeater
7. Sauvegarder le résultat comme nouveau fact
```

### Générer rapport d'exploit

```
User: "Génère un rapport pour toutes mes vulnérabilités BLV"
AI: [Analyse les facts avec http_request, technique=BLV]
    - Liste les endpoints vulnérables
    - Affiche les requêtes POC
    - Génère script Python pour chaque exploit
    - Export en Markdown
```

---

## 🎨 Personnalisation

### Créer des catégories custom

1. **Memory → Categories** → Add category
2. Exemples :
   - 🎰 Gambling Logic
   - 💳 Payment Flow
   - 🔐 Auth Bypass
   - 📊 API Enumeration

### Créer des tags

1. **Memory → Tags** → Create template
2. Exemples :
   - SPIN (pour casino spin mechanics)
   - STAKE (pour betting logic)
   - CRITICAL (pour bounties)
   - EXPLOIT (pour POC fonctionnels)

---

## 📝 Notes techniques

- **Storage** : JSONB flexible (pas de limite de taille headers)
- **Search** : Index GIN sur metadata pour recherche rapide
- **Embeddings** : Requêtes HTTP sont vectorisées pour similarity search
- **Real-time** : Auto-refresh quand nouveau fact créé

---

## 🐛 Troubleshooting

**Problème** : "Parse Error" quand je colle une requête
**Solution** : Vérifier que la première ligne contient `METHOD /path HTTP/x.x`

**Problème** : Headers tronqués ou manquants
**Solution** : Copier depuis Burp via "Copy to file" (pas juste Ctrl+C dans le tab)

**Problème** : L'IA ne détecte pas ma requête dans le chat
**Solution** : S'assurer que la requête contient au minimum method + URL + headers

---

## 🚀 Prochaines évolutions

- [ ] Import batch depuis fichiers Burp (.xml)
- [ ] Export facts vers JSON pour partage
- [ ] Génération automatique de scripts d'exploit (Python/JS)
- [ ] Timeline view pour visualiser les tests chronologiquement
- [ ] Diff view pour comparer 2 requêtes
