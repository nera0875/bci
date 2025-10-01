import { IntelligentTargeting, TargetPath, TargetingContext } from '@/lib/services/intelligentTargeting'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          contains: jest.fn(() => ({
            limit: jest.fn()
          })),
          maybeSingle: jest.fn(),
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        limit: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}))

describe('IntelligentTargeting', () => {
  let targeting: IntelligentTargeting
  const projectId = 'test-project-id'

  beforeEach(() => {
    targeting = new IntelligentTargeting(projectId)
    jest.clearAllMocks()
  })

  describe('analyzeTarget', () => {
    it('devrait détecter section rules pour mots-clés règle', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock rules query
      supabase.from().select().eq().or().order().limit.mockResolvedValueOnce({
        data: []
      })

      // Mock memory query
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })
      supabase.from().select().eq().limit.mockResolvedValueOnce({
        data: []
      })

      const result = await targeting.analyzeTarget('Créer une nouvelle règle')

      expect(result.path.section).toBe('rules')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('devrait détecter section memory par défaut', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Stocker ce résultat')

      expect(result.path.section).toBe('memory')
    })

    it('devrait détecter dossier Business Logic', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Tester prix négatif business logic')

      expect(result.path.folder).toBe('Business Logic')
    })

    it('devrait détecter dossier Success pour mots-clés succès', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Ça a réussi, exploit trouvé!')

      expect(result.path.folder).toBe('Success')
    })

    it('devrait détecter dossier Failed pour mots-clés échec', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Le test a échoué, bloqué par WAF')

      expect(result.path.folder).toBe('Failed')
    })

    it('devrait détecter dossier Authentication', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Bypass login avec token expiré')

      expect(result.path.folder).toBe('Authentication')
    })

    it('devrait augmenter confiance avec document spécifique trouvé', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })

      // Mock document found
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })
      supabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [
          { id: 'doc-1', name: 'SQLi Tests' }
        ]
      })

      const result = await targeting.analyzeTarget('SQLi Tests')

      expect(result.path.document).toBe('SQLi Tests')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('devrait générer suggestions appropriées pour section rules', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('règle business logic')

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.includes('règle'))).toBe(true)
    })

    it('devrait retourner règles pertinentes du contexte', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock rules found
      supabase.from().select().eq().or().order().limit.mockResolvedValueOnce({
        data: [
          {
            id: 'rule-1',
            name: 'Validation prix',
            description: 'Vérifier prix positif',
            priority: 1,
            enabled: true
          }
        ]
      })

      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('business logic')

      expect(result.rules.length).toBeGreaterThan(0)
      expect(result.rules[0].name).toBe('Validation prix')
    })
  })

  describe('executeTargetedAction - create', () => {
    it('devrait créer élément avec dossier existant', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock folder exists
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-folder' }
      })

      // Mock item creation
      supabase.from().insert.mockResolvedValueOnce({ error: null })

      const targetPath: TargetPath = {
        section: 'memory',
        folder: 'Success'
      }

      const success = await targeting.executeTargetedAction(
        'create',
        targetPath,
        {
          name: 'New item',
          content: 'Test content'
        }
      )

      expect(success).toBe(true)
      expect(supabase.from().insert).toHaveBeenCalled()
    })

    it('devrait créer dossier si inexistant avant création item', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock folder doesn't exist
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })

      // Mock folder creation
      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'new-folder-id' },
        error: null
      })

      // Mock item creation
      supabase.from().insert.mockResolvedValueOnce({ error: null })

      const targetPath: TargetPath = {
        section: 'rules',
        folder: 'New Folder'
      }

      const success = await targeting.executeTargetedAction(
        'create',
        targetPath,
        {
          name: 'Test',
          type: 'document'
        }
      )

      expect(success).toBe(true)
      // Should call insert twice: folder + item
      expect(supabase.from().insert).toHaveBeenCalledTimes(2)
    })
  })

  describe('formatTargetingForAI', () => {
    it('devrait formater correctement le contexte pour IA', () => {
      const context: TargetingContext = {
        path: {
          section: 'memory',
          folder: 'Success',
          document: 'SQLi Tests'
        },
        confidence: 0.85,
        suggestions: [
          'Analyser les patterns',
          'Créer une règle'
        ],
        rules: [
          {
            id: 'r1',
            name: 'Règle 1',
            description: 'Description règle',
            trigger: 'business-logic',
            priority: 1,
            enabled: true
          }
        ],
        relevantMemory: []
      }

      const formatted = targeting.formatTargetingForAI(context)

      expect(formatted).toContain('CIBLAGE INTELLIGENT')
      expect(formatted).toContain('Confiance: 85%')
      expect(formatted).toContain('Section: memory')
      expect(formatted).toContain('Dossier: Success')
      expect(formatted).toContain('Document: SQLi Tests')
      expect(formatted).toContain('RÈGLES APPLICABLES')
      expect(formatted).toContain('SUGGESTIONS RECOMMANDÉES')
    })

    it('devrait gérer contexte minimal sans folder ni document', () => {
      const context: TargetingContext = {
        path: {
          section: 'optimization'
        },
        confidence: 0.5,
        suggestions: [],
        rules: [],
        relevantMemory: []
      }

      const formatted = targeting.formatTargetingForAI(context)

      expect(formatted).toContain('Section: optimization')
      expect(formatted).not.toContain('Dossier:')
      expect(formatted).not.toContain('Document:')
    })
  })

  describe('detectFolder - cas spéciaux', () => {
    it('devrait détecter API Security pour mots-clés API', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Tester endpoint API /users')

      expect(result.path.folder).toBe('API Security')
    })

    it('devrait utiliser dossier par défaut selon section', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('Contenu générique')

      // Devrait avoir un dossier par défaut
      expect(result.path.folder).toBeDefined()
    })
  })

  describe('calculateConfidence', () => {
    it('devrait avoir haute confiance avec section + folder + document', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [{ id: 'doc', name: 'Precise Doc' }]
      })

      const result = await targeting.analyzeTarget('règle business logic Precise Doc')

      // Section + folder + document = haute confiance
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('devrait avoir confiance moyenne avec section + folder', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('authentication login')

      // Section + folder sans document
      expect(result.confidence).toBeGreaterThanOrEqual(0.5)
      expect(result.confidence).toBeLessThan(0.9)
    })
  })

  describe('getSuggestions - contexte spécifique', () => {
    it('devrait suggérer actions pour Success', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('succès exploit')

      const hasSuccessActions = result.suggestions.some(s =>
        s.includes('patterns de succès') || s.includes('Dupliquer')
      )
      expect(hasSuccessActions).toBe(true)
    })

    it('devrait suggérer alternatives pour Failed', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('échec test bloqué')

      const hasFailureActions = result.suggestions.some(s =>
        s.includes('échoué') || s.includes('variante') || s.includes('inefficace')
      )
      expect(hasFailureActions).toBe(true)
    })

    it('devrait suggérer optimisations pour section optimization', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().or().order().limit.mockResolvedValue({ data: [] })
      supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null })
      supabase.from().select().eq().limit.mockResolvedValue({ data: [] })

      const result = await targeting.analyzeTarget('améliorer performance')

      const hasOptimizationActions = result.suggestions.some(s =>
        s.includes('Optimiser') || s.includes('performance') || s.includes('efficacité')
      )
      expect(hasOptimizationActions).toBe(true)
    })
  })
})