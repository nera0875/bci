'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PendingFact {
  id: string
  fact: string
  metadata: any
  confidence: number
}

interface PendingFactsToastProps {
  projectId: string
  facts: PendingFact[]
  onValidated: () => void
}

export function PendingFactsToast({ projectId, facts, onValidated }: PendingFactsToastProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(facts.map(f => f.id)))

  const toggleFact = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleValidate = async () => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins 1 fact')
      return
    }

    try {
      // 1. Récupérer pending_facts sélectionnés
      const { data: pending } = await (supabase as any)
        .from('pending_facts')
        .select('*')
        .in('id', Array.from(selected))

      if (!pending || pending.length === 0) return

      // 2. Générer embeddings pour chaque fact
      const factsWithEmbeddings = await Promise.all(
        pending.map(async (p) => {
          try {
            const embeddingRes = await fetch('/api/openai/embeddings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: p.fact, projectId })
            })
            const { embedding } = await embeddingRes.json()
            return {
              project_id: p.project_id,
              fact: p.fact,
              metadata: p.metadata,
              embedding
            }
          } catch (err) {
            console.error('Embedding generation failed:', err)
            // Fallback without embedding
            return {
              project_id: p.project_id,
              fact: p.fact,
              metadata: p.metadata
            }
          }
        })
      )

      // 3. Insert dans memory_facts avec embeddings
      const { error: insertError } = await (supabase as any)
        .from('memory_facts')
        .insert(factsWithEmbeddings)

      if (insertError) throw insertError

      // 3. Update status pending_facts
      await (supabase as any)
        .from('pending_facts')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .in('id', Array.from(selected))

      // 4. Track decision
      await (supabase as any).from('user_decisions').insert({
        project_id: projectId,
        decision_type: 'fact_validation',
        proposed_action: { facts: pending },
        user_choice: 'accept',
        confidence_score: pending.reduce((sum, p) => sum + p.confidence, 0) / pending.length
      })

      // 5. Incrémenter la progression du projet
      await (supabase as any).rpc('increment_progress', {
        p_project_id: projectId,
        p_points: selected.size * 5, // 5 points par fact
        p_facts_count: selected.size
      })

      toast.success(`✅ ${selected.size} fact(s) validé(s) • +${selected.size * 5} points`)
      onValidated()
    } catch (error: any) {
      console.error('Error validating facts:', error)
      toast.error('Erreur validation')
    }
  }

  const handleRejectAll = async () => {
    try {
      await (supabase as any)
        .from('pending_facts')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .in('id', facts.map(f => f.id))

      await (supabase as any).from('user_decisions').insert({
        project_id: projectId,
        decision_type: 'fact_validation',
        proposed_action: { facts },
        user_choice: 'reject'
      })

      toast.success('❌ Facts refusés')
      onValidated()
    } catch (error: any) {
      console.error('Error rejecting facts:', error)
      toast.error('Erreur rejet')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 max-w-md border-l-4 border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            🧠 {facts.length} fact(s) détecté(s)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sélectionnez ceux à valider
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
        {facts.map(fact => (
          <div
            key={fact.id}
            onClick={() => toggleFact(fact.id)}
            className={`p-2 rounded border cursor-pointer transition-colors ${
              selected.has(fact.id)
                ? 'border-gray-700 bg-gray-100 dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {selected.has(fact.id) ? (
                  <CheckSquare size={16} className="text-gray-700" />
                ) : (
                  <Square size={16} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                  {fact.fact}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {fact.metadata.category && (
                    <Badge variant="outline" className="text-xs">
                      📁 {fact.metadata.category}
                    </Badge>
                  )}
                  {fact.metadata.severity && (
                    <Badge variant="outline" className="text-xs">
                      ⚠️ {fact.metadata.severity}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {Math.round(fact.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleValidate}
          disabled={selected.size === 0}
          className="flex-1 bg-gray-700 hover:bg-gray-800"
          size="sm"
        >
          ✅ Valider ({selected.size})
        </Button>
        <Button
          onClick={handleRejectAll}
          variant="outline"
          size="sm"
        >
          ❌ Tout refuser
        </Button>
      </div>
    </div>
  )
}
