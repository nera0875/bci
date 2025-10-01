import { LearningSystem, LearningPattern, analyzeSuccessPattern, generateNextSteps } from '@/lib/services/learningSystem'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          })),
          limit: jest.fn(),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          })),
          lt: jest.fn(() => ({
            lt: jest.fn()
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            lt: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn()
    })),
    rpc: jest.fn()
  }
}))

// Mock AdaptiveMemory
jest.mock('@/lib/services/adaptiveMemory', () => ({
  AdaptiveMemory: jest.fn().mockImplementation(() => ({
    reinforceTechnique: jest.fn(),
    searchMemory: jest.fn().mockResolvedValue([
      { id: '1', importance: 0.8, content: 'test' }
    ])
  }))
}))

describe('LearningSystem', () => {
  let learningSystem: LearningSystem
  const projectId = 'test-project-id'

  beforeEach(() => {
    learningSystem = new LearningSystem(projectId)
    jest.clearAllMocks()
  })

  describe('recordSuccess', () => {
    it('devrait enregistrer un succès et augmenter le taux de succès', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      // Mock existing pattern
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pattern-1',
          pattern_type: 'SQL Injection',
          usage_count: 5,
          success_rate: 0.6,
          pattern: { recent_successes: [] }
        }
      })

      supabase.from().update().eq.mockResolvedValueOnce({ error: null })

      await learningSystem.recordSuccess({
        technique: 'SQL Injection',
        context: 'authentication',
        target: '/login',
        payload: "' OR 1=1--"
      })

      expect(supabase.from).toHaveBeenCalledWith('attack_patterns')
      expect(supabase.from().update).toHaveBeenCalled()
    })

    it('devrait créer un nouveau pattern si inexistant', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })

      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'new-pattern' },
        error: null
      })

      await learningSystem.recordSuccess({
        technique: 'XSS',
        context: 'business-logic',
        payload: '<script>alert(1)</script>'
      })

      expect(supabase.from().insert).toHaveBeenCalled()
    })

    it('devrait appeler reinforceTechnique de AdaptiveMemory', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })

      await learningSystem.recordSuccess({
        technique: 'IDOR',
        context: 'api-requests'
      })

      const { AdaptiveMemory } = require('@/lib/services/adaptiveMemory')
      const mockInstance = AdaptiveMemory.mock.results[0].value
      
      expect(mockInstance.reinforceTechnique).toHaveBeenCalledWith(
        'IDOR',
        'api-requests',
        true
      )
    })
  })

  describe('recordFailure', () => {
    it('devrait enregistrer un échec et diminuer le taux de succès', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pattern-2',
          pattern_type: 'CSRF',
          usage_count: 10,
          success_rate: 0.8,
          pattern: { recent_failures: [] }
        }
      })

      supabase.from().update().eq.mockResolvedValueOnce({ error: null })

      await learningSystem.recordFailure({
        technique: 'CSRF',
        context: 'authentication',
        reason: 'Token validation active'
      })

      expect(supabase.from().update).toHaveBeenCalled()
    })

    it('devrait appeler reinforceTechnique avec false', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })

      await learningSystem.recordFailure({
        technique: 'Command Injection',
        context: 'business-logic',
        reason: 'Input sanitization'
      })

      const { AdaptiveMemory } = require('@/lib/services/adaptiveMemory')
      const mockInstance = AdaptiveMemory.mock.results[0].value
      
      expect(mockInstance.reinforceTechnique).toHaveBeenCalledWith(
        'Command Injection',
        'business-logic',
        false
      )
    })
  })

  describe('getSuggestions', () => {
    it('devrait retourner des suggestions basées sur le taux de succès', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().gte().order().limit.mockResolvedValueOnce({
        data: [
          { pattern_type: 'SQLi', success_rate: 0.9 },
          { pattern_type: 'XSS', success_rate: 0.7 }
        ]
      })

      const suggestions = await learningSystem.getSuggestions('business-logic')

      expect(suggestions).toContain('SQLi (90% de réussite)')
      expect(suggestions).toContain('XSS (70% de réussite)')
      expect(suggestions).toContain('Tester les prix négatifs')
    })

    it('devrait inclure des suggestions contextuelles pour authentication', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().gte().order().limit.mockResolvedValueOnce({
        data: []
      })

      const suggestions = await learningSystem.getSuggestions('authentication')

      expect(suggestions).toContain("Tester l'IDOR")
      expect(suggestions).toContain('Vérifier les tokens expirés')
    })
  })

  describe('predictEffectiveness', () => {
    it('devrait retourner le taux de succès si pattern existe avec usage >= 3', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          success_rate: 0.85,
          usage_count: 5
        }
      })

      const effectiveness = await learningSystem.predictEffectiveness(
        'Path Traversal',
        'api-requests'
      )

      expect(effectiveness).toBe(0.85)
    })

    it('devrait utiliser searchMemory si pattern manque de données', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          success_rate: 0.5,
          usage_count: 1 // < 3
        }
      })

      const effectiveness = await learningSystem.predictEffectiveness(
        'XXE',
        'business-logic'
      )

      const { AdaptiveMemory } = require('@/lib/services/adaptiveMemory')
      const mockInstance = AdaptiveMemory.mock.results[0].value
      
      expect(mockInstance.searchMemory).toHaveBeenCalledWith('XXE', 'business-logic', 5)
      expect(effectiveness).toBeGreaterThanOrEqual(0)
      expect(effectiveness).toBeLessThanOrEqual(1)
    })

    it('devrait retourner 0.5 par défaut si aucune donnée', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null
      })

      const { AdaptiveMemory } = require('@/lib/services/adaptiveMemory')
      const mockInstance = AdaptiveMemory.mock.results[0].value
      mockInstance.searchMemory.mockResolvedValueOnce([])

      const effectiveness = await learningSystem.predictEffectiveness(
        'Unknown',
        'unknown'
      )

      expect(effectiveness).toBe(0.5)
    })
  })

  describe('getTopPatterns', () => {
    it('devrait retourner les patterns triés par success_rate', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [
          {
            id: 'p1',
            project_id: projectId,
            pattern_type: 'success',
            usage_count: 10,
            success_rate: 0.9,
            pattern: { context: 'auth' },
            created_at: '2024-01-01'
          },
          {
            id: 'p2',
            project_id: projectId,
            pattern_type: 'failure',
            usage_count: 5,
            success_rate: 0.2,
            pattern: { context: 'api' },
            created_at: '2024-01-02'
          }
        ]
      })

      const patterns = await learningSystem.getTopPatterns(10)

      expect(patterns).toHaveLength(2)
      expect(patterns[0].success_rate).toBe(0.9)
      expect(patterns[1].success_rate).toBe(0.2)
    })
  })

  describe('getPredictions', () => {
    it('devrait générer des prédictions avec alternatives pour échecs', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [
          {
            pattern_type: 'SQLi',
            success_rate: 0.8,
            usage_count: 10,
            pattern: {
              context: 'auth',
              recent_failures: [{ reason: 'WAF blocked' }]
            }
          },
          {
            pattern_type: 'NoSQL Injection',
            success_rate: 0.9,
            usage_count: 5,
            pattern: { context: 'auth' }
          }
        ]
      })

      const predictions = await learningSystem.getPredictions('auth', 5)

      expect(predictions).toHaveLength(2)
      expect(predictions[0].confidence).toBeGreaterThan(predictions[1].confidence)
      
      // Vérifier alternatives pour pattern avec échecs
      const sqlPred = predictions.find(p => p.technique === 'SQLi')
      expect(sqlPred?.alternatives).toBeDefined()
    })
  })
})

describe('analyzeSuccessPattern', () => {
  it('devrait analyser correctement un pattern SQL', () => {
    const pattern = analyzeSuccessPattern(
      'SQL Injection',
      "' OR 1=1--",
      'Database error: syntax error'
    )

    expect(pattern.technique).toBe('SQL Injection')
    expect(pattern.contains_sql).toBe(true)
    expect(pattern.result_type).toBe('error')
  })

  it('devrait détecter les caractères spéciaux', () => {
    const pattern = analyzeSuccessPattern(
      'XSS',
      '<script>alert("test")</script>',
      'success'
    )

    expect(pattern.contains_special_chars).toBe(true)
    expect(pattern.contains_js).toBe(true)
  })

  it('devrait détecter les patterns de traversal', () => {
    const pattern = analyzeSuccessPattern(
      'Path Traversal',
      '../../../etc/passwd',
      'File contents'
    )

    expect(pattern.contains_traversal).toBe(true)
  })
})

describe('generateNextSteps', () => {
  it('devrait suggérer de répéter les techniques efficaces', () => {
    const successPatterns: LearningPattern[] = [
      {
        id: '1',
        project_id: 'test',
        pattern_type: 'success',
        context: 'auth',
        pattern_data: {},
        usage_count: 10,
        success_rate: 0.8,
        last_used: '2024-01-01',
        created_at: '2024-01-01',
        metadata: {}
      }
    ]

    const steps = generateNextSteps('auth', successPatterns, [])

    expect(steps.length).toBeGreaterThan(0)
    expect(steps[0]).toContain('Répéter les techniques efficaces')
  })

  it('devrait suggérer d\'éviter les techniques inefficaces', () => {
    const failurePatterns: LearningPattern[] = [
      {
        id: '2',
        project_id: 'test',
        pattern_type: 'failure',
        context: 'api',
        pattern_data: {},
        usage_count: 5,
        success_rate: 0.1,
        last_used: '2024-01-01',
        created_at: '2024-01-01',
        metadata: {}
      }
    ]

    const steps = generateNextSteps('api', [], failurePatterns)

    expect(steps.some(step => step.includes('Éviter'))).toBe(true)
  })

  it('devrait inclure des suggestions contextuelles pour business-logic', () => {
    const steps = generateNextSteps('business-logic', [], [])

    expect(steps).toContain('Tester les valeurs extrêmes')
    expect(steps).toContain('Vérifier les workflows multi-étapes')
  })
})