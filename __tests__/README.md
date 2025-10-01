# 🧪 Guide des Tests - BCI Tool v2

## 📊 Vue d'Ensemble

Cette suite de tests garantit la **qualité et stabilité** du système BCI Tool v2 avec une couverture de **70%+ minimum**.

### Structure des Tests

```
__tests__/
├── services/              # Tests unitaires des services critiques
│   ├── learningSystem.test.ts      (25+ tests)
│   ├── adaptiveMemory.test.ts      (22+ tests)
│   └── intelligentTargeting.test.ts (20+ tests)
├── integration/           # Tests d'intégration (à venir)
└── README.md             # Ce fichier
```

## 🚀 Commandes

### Développement Local
```bash
# Lancer tests en mode watch (développement)
npm test

# Lancer tests une fois avec coverage
npm run test:coverage

# Lancer tests pour CI/CD
npm run test:ci
```

### Coverage Requis
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 📋 Tests Implémentés

### ✅ LearningSystem (25+ tests)
- ✓ `recordSuccess` - Enregistrement succès + augmentation taux
- ✓ `recordFailure` - Enregistrement échec + diminution taux
- ✓ `getSuggestions` - Suggestions contextuelles basées sur historique
- ✓ `predictEffectiveness` - Prédictions efficacité techniques
- ✓ `getPredictions` - Prédictions avec alternatives pour échecs
- ✓ `getTopPatterns` - Top patterns triés par success_rate
- ✓ Utilitaires: `analyzeSuccessPattern`, `generateNextSteps`

### ✅ AdaptiveMemory (22+ tests)
- ✓ `addMemoryItem` - Création éléments avec importance calculée
- ✓ `getContextualMemory` - RAG vectoriel + cache intelligent
- ✓ `updateUsage` - Incrémentation usage + ajustement importance
- ✓ `reinforceTechnique` - Renforcement bidirectionnel (succès/échec)
- ✓ `cleanupMemory` - Nettoyage automatique éléments obsolètes
- ✓ `searchMemory` - Recherche sémantique avec filtrage contexte
- ✓ `getMemoryStats` - Statistiques complètes mémoire

### ✅ IntelligentTargeting (20+ tests)
- ✓ `analyzeTarget` - Détection section/dossier/document
- ✓ `executeTargetedAction` - Actions CRUD ciblées
- ✓ `formatTargetingForAI` - Formatage contexte pour IA
- ✓ Calcul confiance multi-niveaux
- ✓ Génération suggestions contextuelles
- ✓ Détection patterns: Business Logic, Auth, Success, Failed

## 🔧 Configuration

### Jest (`jest.config.js`)
```javascript
{
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
```

### Mocks
Tous les tests utilisent des mocks pour:
- **Supabase client** - Isolation base de données
- **Embeddings OpenAI** - Éviter appels API réels
- **Fetch global** - Contrôle requêtes HTTP

## 📈 CI/CD Integration

Les tests s'exécutent automatiquement via **GitHub Actions** sur:
- ✅ Chaque push sur `main` ou `develop`
- ✅ Chaque Pull Request
- ✅ Multi-version Node.js (18.x, 20.x)

### Pipeline Complet
1. **Lint** - ESLint pour code quality
2. **Tests** - Jest avec coverage
3. **Build** - Validation compilation Next.js
4. **Security** - npm audit + Trivy scan
5. **Deploy** - Vercel (preview pour PR, prod pour main)

## 🎯 Prochaines Étapes

### Tests d'Intégration (À venir)
```bash
__tests__/integration/
├── workflow-learning.test.ts    # Workflow apprentissage complet
├── workflow-rag.test.ts         # RAG end-to-end
└── workflow-targeting.test.ts   # Ciblage multi-niveau
```

### Tests E2E (Futur)
- Playwright pour tests UI
- Scénarios utilisateur complets
- Tests cross-browser

## 💡 Bonnes Pratiques

### Écrire un Nouveau Test
```typescript
import { ServiceName } from '@/lib/services/serviceName'

describe('ServiceName', () => {
  let service: ServiceName
  
  beforeEach(() => {
    service = new ServiceName('test-project')
    jest.clearAllMocks()
  })
  
  it('devrait faire quelque chose de spécifique', async () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = await service.method(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

### Naming Convention
- ✅ `devrait [action attendue]` pour décrire comportement
- ✅ Tests groupés par méthode avec `describe`
- ✅ Setup commun dans `beforeEach`
- ✅ Noms explicites et descriptifs

## 🐛 Debugging Tests

### Test Isolé
```bash
# Lancer un seul fichier
npm test learningSystem.test.ts

# Lancer un seul test
npm test -- -t "devrait enregistrer un succès"
```

### Verbose Output
```bash
# Mode verbose pour plus d'infos
npm test -- --verbose

# Watch mode avec coverage
npm test -- --coverage --watch
```

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Dernière mise à jour**: 2025-09-29  
**Coverage actuel**: Tests unitaires services critiques (67+ tests)