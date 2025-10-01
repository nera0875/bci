import { AdaptiveMemory, MemoryItem } from '@/lib/services/adaptiveMemory'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          contains: jest.fn(() => ({
            limit: jest.fn(),
            lt: jest.fn(() => ({
              lt: jest.fn()
            }))
          })),
          maybeSingle: jest.fn(),
          single: jest.fn()
        })),
        contains: jest.fn(() => ({
          contains: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        in: jest.fn()
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
        in: jest.fn()
      }))
    })),
    rpc: jest.fn(),
    raw: jest.fn((sql) => sql)
  }
}))

// Mock embeddings
jest.mock('@/lib/services/embeddings', () => ({
  createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
}))

describe('AdaptiveMemory', () => {
  let adaptiveMemory: AdaptiveMemory
  const projectId = 'test-project-id'

  beforeEach(() => {
    adaptiveMemory = new AdaptiveMemory(projectId)
    jest.clearAllMocks()
  })

  describe('addMemoryItem', () => {
    it('devrait créer un nouvel élément mémoire avec importance calculée', async () => {
      const { supabase } = require('@/lib/supabase/client')
      const { createEmbedding } = require('@/lib/services/embeddings')

      // Mock folder exists
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id: 'folder-id' }
      })

      // Mock insert success
      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'memory-1',
          content: { raw_content: 'Test memory' }
        },
        error: null
      })

      await adaptiveMemory.addMemoryItem(
        'Test memory content',
        'business-logic',
        'success',
        { test: true }
      )

      expect(createEmbedding).toHaveBeenCalledWith('Test memory content')
      expect(supabase.from).toHaveBeenCalledWith('memory_nodes')
      expect(supabase.from().insert).toHaveBeenCalled()
    })

    it('devrait créer le dossier parent si inexistant', async () => {
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

      // Mock memory item creation
      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'memory-2' },
        error: null
      })

      await adaptiveMemory.addMemoryItem(
        'New content',
        'authentication',
        'rule'
      )

      // Should call insert twice: folder + memory
      expect(supabase.from().insert).toHaveBeenCalledTimes(2)
    })

    it('devrait calculer importance plus élevée pour type success', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'folder-id' }
      })

      let capturedImportance: number | undefined

      supabase.from().insert.mockImplementation((data: any) => {
        if (data.metadata?.importance !== undefined) {
          capturedImportance = data.metadata.importance
        }
        return {
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test' },
              error: null
            })
          }))
        }
      })

      await adaptiveMemory.addMemoryItem(
        'Success story with exploit details',
        'business-logic',
        'success'
      )

      expect(capturedImportance).toBeGreaterThan(0.5)
    })
  })

  describe('getContextualMemory', () => {
    it('devrait retourner mémoire par similarité vectorielle', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'mem-1',
            content: { raw_content: 'Similar content', context: 'auth' },
            metadata: { adaptive_memory: true, importance: 0.8, usage_count: 5 },
            created_at: '2024-01-01'
          },
          {
            id: 'mem-2',
            content: { raw_content: 'Another similar', context: 'auth' },
            metadata: { adaptive_memory: true, importance: 0.6, usage_count: 3 },
            created_at: '2024-01-02'
          }
        ]
      })

      const result = await adaptiveMemory.getContextualMemory(
        'Test query',
        'auth',
        10
      )

      expect(supabase.rpc).toHaveBeenCalledWith('search_similar_nodes', expect.any(Object))
      expect(result).toHaveProperty('rules')
      expect(result).toHaveProperty('successes')
      expect(result).toHaveProperty('failures')
    })

    it('devrait utiliser le cache si valide', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Premier appel
      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'cached-1',
            content: { raw_content: 'Cached', context: 'test' },
            metadata: { adaptive_memory: true, importance: 0.7, usage_count: 2 },
            created_at: '2024-01-01'
          }
        ]
      })

      await adaptiveMemory.getContextualMemory('Query 1', 'test')
      
      // Deuxième appel identique
      await adaptiveMemory.getContextualMemory('Query 1', 'test')

      // RPC devrait être appelé une seule fois grâce au cache
      expect(supabase.rpc).toHaveBeenCalledTimes(1)
    })

    it('devrait fallback sur recherche par contexte si peu de résultats', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock RPC avec peu de résultats
      supabase.rpc.mockResolvedValueOnce({ data: [] })

      // Mock context search
      supabase.from().select().eq().contains().contains().limit.mockResolvedValueOnce({
        data: [
          {
            id: 'context-1',
            content: { raw_content: 'Context match', context: 'api' },
            metadata: { adaptive_memory: true, importance: 0.5, usage_count: 1 },
            created_at: '2024-01-01'
          }
        ]
      })

      const result = await adaptiveMemory.getContextualMemory(
        'API test',
        'api',
        10
      )

      expect(supabase.from).toHaveBeenCalled()
    })
  })

  describe('updateUsage', () => {
    it('devrait incrémenter usage_count et augmenter importance', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          metadata: {
            usage_count: 5,
            importance: 0.6
          }
        }
      })

      supabase.from().update().eq.mockResolvedValueOnce({ error: null })

      await adaptiveMemory.updateUsage('item-123')

      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            usage_count: 6,
            importance: expect.any(Number)
          })
        })
      )
    })

    it('devrait limiter importance à 1.0 maximum', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          metadata: {
            usage_count: 100,
            importance: 0.98
          }
        }
      })

      let capturedImportance: number | undefined

      supabase.from().update.mockImplementationOnce((data: any) => {
        capturedImportance = data.metadata.importance
        return {
          eq: jest.fn().mockResolvedValue({ error: null })
        }
      })

      await adaptiveMemory.updateUsage('item-max')

      expect(capturedImportance).toBeLessThanOrEqual(1.0)
    })
  })

  describe('reinforceTechnique', () => {
    it('devrait augmenter importance pour succès', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock searchMemory résultats
      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'tech-1',
            content: { raw_content: 'SQLi technique' },
            metadata: { adaptive_memory: true, importance: 0.5, usage_count: 3 }
          }
        ]
      })

      // Mock current metadata
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          metadata: { importance: 0.5, usage_count: 3 }
        }
      })

      supabase.from().update().eq.mockResolvedValue({ error: null })

      // Mock API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      await adaptiveMemory.reinforceTechnique('SQLi', 'auth', true)

      const updateCall = supabase.from().update.mock.calls[0][0]
      expect(updateCall.metadata.importance).toBeGreaterThan(0.5)
    })

    it('devrait diminuer importance pour échec', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'tech-2',
            content: { raw_content: 'Failed XSS' },
            metadata: { adaptive_memory: true, importance: 0.7, usage_count: 2 }
          }
        ]
      })

      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          metadata: { importance: 0.7, usage_count: 2 }
        }
      })

      supabase.from().update().eq.mockResolvedValue({ error: null })

      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await adaptiveMemory.reinforceTechnique('XSS', 'business-logic', false)

      const updateCall = supabase.from().update.mock.calls[0][0]
      expect(updateCall.metadata.importance).toBeLessThan(0.7)
    })

    it('devrait créer nouvelle mémoire si technique inexistante', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock empty search
      supabase.rpc.mockResolvedValueOnce({ data: [] })

      // Mock folder
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id: 'folder' }
      })

      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'new-tech' },
        error: null
      })

      await adaptiveMemory.reinforceTechnique('NewTech', 'api', true)

      expect(supabase.from().insert).toHaveBeenCalled()
    })
  })

  describe('cleanupMemory', () => {
    it('devrait supprimer éléments avec faible importance et peu d\'usage', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().contains().lt().lt.mockResolvedValueOnce({
        data: [
          { id: 'low-1' },
          { id: 'low-2' }
        ]
      })

      supabase.from().delete().in.mockResolvedValueOnce({ error: null })

      const cleaned = await adaptiveMemory.cleanupMemory(0.2)

      expect(cleaned).toBe(2)
      expect(supabase.from().delete).toHaveBeenCalled()
    })

    it('ne devrait rien supprimer si aucun élément à nettoyer', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().contains().lt().lt.mockResolvedValueOnce({
        data: []
      })

      const cleaned = await adaptiveMemory.cleanupMemory(0.2)

      expect(cleaned).toBe(0)
      expect(supabase.from().delete).not.toHaveBeenCalled()
    })
  })

  describe('searchMemory', () => {
    it('devrait rechercher avec embeddings et filtrer par contexte', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'search-1',
            content: { raw_content: 'Match', context: 'auth' },
            metadata: { adaptive_memory: true, importance: 0.8, usage_count: 4 },
            created_at: '2024-01-01'
          },
          {
            id: 'search-2',
            content: { raw_content: 'No match', context: 'api' },
            metadata: { adaptive_memory: true, importance: 0.6, usage_count: 2 },
            created_at: '2024-01-02'
          }
        ]
      })

      const results = await adaptiveMemory.searchMemory('query', 'auth', 5)

      expect(results).toHaveLength(1)
      expect(results[0].context).toBe('auth')
    })

    it('devrait trier par importance décroissante', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            content: { raw_content: 'Low' },
            metadata: { adaptive_memory: true, importance: 0.3, usage_count: 1 },
            created_at: '2024-01-01'
          },
          {
            id: '2',
            content: { raw_content: 'High' },
            metadata: { adaptive_memory: true, importance: 0.9, usage_count: 10 },
            created_at: '2024-01-02'
          }
        ]
      })

      const results = await adaptiveMemory.searchMemory('test')

      expect(results[0].importance).toBe(0.9)
      expect(results[1].importance).toBe(0.3)
    })
  })

  describe('getMemoryStats', () => {
    it('devrait calculer statistiques correctes', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from().select().eq().contains.mockResolvedValueOnce({
        data: [
          {
            content: { type: 'success', context: 'auth' },
            metadata: { importance: 0.8 }
          },
          {
            content: { type: 'success', context: 'api' },
            metadata: { importance: 0.6 }
          },
          {
            content: { type: 'failure', context: 'auth' },
            metadata: { importance: 0.4 }
          }
        ]
      })

      const stats = await adaptiveMemory.getMemoryStats()

      expect(stats.total).toBe(3)
      expect(stats.byType.success).toBe(2)
      expect(stats.byType.failure).toBe(1)
      expect(stats.byContext.auth).toBe(2)
      expect(stats.byContext.api).toBe(1)
      expect(stats.avgImportance).toBeCloseTo(0.6, 1)
    })
  })
})