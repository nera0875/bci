'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Link2, ArrowRight, Shield, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { FactRelation } from '@/lib/types/http-metadata'

interface Fact {
  id: string
  fact: string
  metadata: any
}

interface FactRelationPickerProps {
  projectId: string
  currentFactId: string
  relations: FactRelation[]
  onChange: (relations: FactRelation[]) => void
  allFacts?: Fact[]
}

export function FactRelationPicker({
  projectId,
  currentFactId,
  relations,
  onChange,
  allFacts = []
}: FactRelationPickerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedFactId, setSelectedFactId] = useState('')
  const [relationType, setRelationType] = useState<FactRelation['type']>('enables')
  const [note, setNote] = useState('')
  const [facts, setFacts] = useState<Fact[]>(allFacts)

  useEffect(() => {
    if (allFacts.length === 0) {
      loadFacts()
    } else {
      setFacts(allFacts)
    }
  }, [allFacts, projectId])

  const loadFacts = async () => {
    const { data } = await supabase
      .from('memory_facts')
      .select('id, fact, metadata')
      .eq('project_id', projectId)
      .neq('id', currentFactId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setFacts(data)
  }

  const addRelation = () => {
    if (!selectedFactId) {
      toast.error('Select a fact to relate')
      return
    }

    const newRelation: FactRelation = {
      fact_id: selectedFactId,
      type: relationType,
      ...(note && { note })
    }

    onChange([...relations, newRelation])
    setIsAdding(false)
    setSelectedFactId('')
    setNote('')
    toast.success('Relation added')
  }

  const removeRelation = (index: number) => {
    const newRelations = relations.filter((_, i) => i !== index)
    onChange(newRelations)
    toast.success('Relation removed')
  }

  const getRelationIcon = (type: FactRelation['type']) => {
    switch (type) {
      case 'enables': return <ArrowRight className="w-3 h-3" />
      case 'requires': return <AlertTriangle className="w-3 h-3" />
      case 'similar_to': return <Link2 className="w-3 h-3" />
      case 'mitigates': return <Shield className="w-3 h-3" />
      case 'blocks': return <X className="w-3 h-3" />
    }
  }

  const getRelationColor = (type: FactRelation['type']) => {
    switch (type) {
      case 'enables': return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
      case 'requires': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
      case 'similar_to': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
      case 'mitigates': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
      case 'blocks': return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
    }
  }

  const getRelationLabel = (type: FactRelation['type']) => {
    switch (type) {
      case 'enables': return 'Enables'
      case 'requires': return 'Requires'
      case 'similar_to': return 'Similar to'
      case 'mitigates': return 'Mitigates'
      case 'blocks': return 'Blocks'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          🔗 Related Facts
        </label>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Existing relations */}
      {relations.length > 0 && (
        <div className="space-y-2">
          {relations.map((relation, index) => {
            const relatedFact = facts.find(f => f.id === relation.fact_id)
            return (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <Badge className={getRelationColor(relation.type)}>
                  {getRelationIcon(relation.type)}
                  <span className="ml-1">{getRelationLabel(relation.type)}</span>
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                    {relatedFact?.fact || `Fact ${relation.fact_id.slice(0, 8)}...`}
                  </p>
                  {relation.note && (
                    <p className="text-xs text-gray-500 mt-1">{relation.note}</p>
                  )}
                </div>
                <button
                  onClick={() => removeRelation(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add relation form */}
      {isAdding && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Relation Type
            </label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as FactRelation['type'])}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            >
              <option value="enables">Enables (this fact → enables that fact)</option>
              <option value="requires">Requires (this fact requires that fact)</option>
              <option value="similar_to">Similar to (same pattern)</option>
              <option value="mitigates">Mitigates (this fact fixes that vuln)</option>
              <option value="blocks">Blocks (this fact prevents that attack)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Select Fact
            </label>
            <select
              value={selectedFactId}
              onChange={(e) => setSelectedFactId(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            >
              <option value="">-- Select a fact --</option>
              {facts.map(fact => (
                <option key={fact.id} value={fact.id}>
                  {fact.fact.substring(0, 60)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Combine both for 10K€ fraud"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={addRelation}
              disabled={!selectedFactId}
              className="flex-1"
            >
              Add Relation
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false)
                setSelectedFactId('')
                setNote('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {relations.length === 0 && !isAdding && (
        <p className="text-xs text-gray-500 text-center py-2">
          No related facts yet
        </p>
      )}
    </div>
  )
}
