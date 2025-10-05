'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Suggestion {
  id: string
  project_id: string
  type: 'storage' | 'rule' | 'improvement' | 'pattern'
  status: 'pending' | 'accepted' | 'rejected'
  suggestion: any  // Column name in DB is 'suggestion', not 'data'
  confidence: number
  created_at: string
}

interface SuggestionsPanelProps {
  projectId: string
}

export default function SuggestionsPanel({ projectId }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending')
  const [typeFilter, setTypeFilter] = useState<'all' | 'storage' | 'rule' | 'improvement' | 'pattern'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [modifyingSuggestion, setModifyingSuggestion] = useState<Suggestion | null>(null)
  const [modifiedData, setModifiedData] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    loadSuggestions()
  }, [projectId, filter, typeFilter, currentPage])

  const loadSuggestions = async () => {
    try {
      setLoading(true)

      // Count total items
      let countQuery = supabase
        .from('suggestions_queue')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (filter !== 'all') {
        countQuery = countQuery.eq('status', filter)
      }

      if (typeFilter !== 'all') {
        countQuery = countQuery.eq('type', typeFilter)
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      // Fetch paginated data
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('suggestions_queue')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setSuggestions(data || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      toast.error('Erreur chargement suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (id: string, decision: 'accept' | 'reject', modifiedData?: any) => {
    try {
      const suggestion = suggestions.find(s => s.id === id)
      if (!suggestion) return

      // 1. Update suggestion status
      const { error: updateError } = await supabase
        .from('suggestions_queue')
        .update({ status: decision === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', id)

      if (updateError) throw updateError

      // 2. Track decision
      const { error: trackError } = await supabase
        .from('user_decisions')
        .insert({
          project_id: projectId,
          decision_type: decision,
          context: {
            modified: modifiedData,
            original: suggestion.suggestion,
            suggestion_id: id,  // Garder en metadata seulement
            suggestion_type: suggestion.type
          },
          proposed_action: suggestion.suggestion,  // ✅ REQUIS par schéma DB
          user_choice: decision === 'accept' ? 'accept' : 'reject',  // ✅ REQUIS par schéma DB
          confidence_score: suggestion.confidence
        })

      if (trackError) console.warn('Track decision failed:', trackError)

      // 3. Execute action if accepted
      if (decision === 'accept') {
        await executeSuggestion(suggestion, modifiedData)
      }

      toast.success(`Suggestion ${decision === 'accept' ? 'acceptée' : 'rejetée'} !`)

      // Reset to page 1 and reload
      setCurrentPage(1)
      await loadSuggestions()
    } catch (error) {
      console.error('Error handling decision:', error)
      toast.error('Erreur lors de la décision')
    }
  }

  const executeSuggestion = async (suggestion: Suggestion, modifiedData?: any) => {
    const finalData = modifiedData || suggestion.suggestion

    try {
      switch (suggestion.type) {
        case 'storage':
          // Create document in memory_nodes
          const { error: memoryError } = await supabase
            .from('memory_nodes')
            .insert({
              project_id: projectId,
              name: finalData.name || 'Document sans nom',
              content: finalData.content || '',
              type: 'document',
              parent_id: finalData.target_folder_id || null,
              metadata: { auto_created: true, suggestion_id: suggestion.id }
            })

          if (memoryError) throw memoryError
          toast.success('📄 Document créé dans Memory!')
          break

        case 'rule':
          // Create rule - Extract name from multiple sources
          const ruleName =
            finalData.name ||
            suggestion.suggestion?.name ||
            (typeof suggestion.suggestion === 'string' ? suggestion.suggestion.substring(0, 50) : null) ||
            `Rule ${new Date().toISOString().substring(0, 10)}`

          const { error: ruleError } = await supabase
            .from('rules')
            .insert({
              project_id: projectId,
              name: ruleName,
              trigger: finalData.trigger || suggestion.suggestion?.trigger || '',
              action: finalData.action || suggestion.suggestion?.action || '',
              enabled: false, // User must enable manually
              metadata: { auto_created: true, suggestion_id: suggestion.id }
            })

          if (ruleError) throw ruleError
          toast.success(`⚙️ Règle "${ruleName}" créée! Active-la dans Rules tab.`)
          break

        case 'improvement':
          // Just log for now (could trigger other actions)
          console.log('Improvement accepted:', finalData)
          toast.success('✨ Amélioration notée!')
          break

        case 'pattern':
          // Store in learned_patterns
          const { error: patternError } = await supabase
            .from('learned_patterns')
            .insert({
              project_id: projectId,
              pattern_data: finalData,
              confidence: suggestion.confidence,
              evidence_count: 1,
              context: finalData.context || 'general'
            })

          if (patternError) throw patternError
          toast.success('🎯 Pattern enregistré!')
          break
      }
    } catch (error) {
      console.error('Error executing suggestion:', error)
      throw error
    }
  }

  const openModifyDialog = (suggestion: Suggestion) => {
    setModifyingSuggestion(suggestion)
    setModifiedData(JSON.stringify(suggestion.suggestion, null, 2))
    setModifyDialogOpen(true)
  }

  const handleModify = async () => {
    if (!modifyingSuggestion) return

    try {
      const parsedData = JSON.parse(modifiedData)
      await handleDecision(modifyingSuggestion.id, 'accept', parsedData)
      setModifyDialogOpen(false)
    } catch (error) {
      toast.error('JSON invalide')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'storage': return '📄'
      case 'rule': return '⚙️'
      case 'improvement': return '✨'
      case 'pattern': return '🎯'
      default: return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Count suggestions by type
  const typeCounts = {
    storage: suggestions.filter(s => s.type === 'storage').length,
    rule: suggestions.filter(s => s.type === 'rule').length,
    improvement: suggestions.filter(s => s.type === 'improvement').length,
    pattern: suggestions.filter(s => s.type === 'pattern').length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Type Filters - Primary */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter by type:</span>
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="gap-2"
          >
            📊 All
          </Button>
          <Button
            variant={typeFilter === 'storage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('storage')}
            className="gap-2"
          >
            💾 Storage
            {typeCounts.storage > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {typeCounts.storage}
              </span>
            )}
          </Button>
          <Button
            variant={typeFilter === 'rule' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('rule')}
            className="gap-2"
          >
            📋 Rules
            {typeCounts.rule > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-600 text-white rounded-full">
                {typeCounts.rule}
              </span>
            )}
          </Button>
          <Button
            variant={typeFilter === 'improvement' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('improvement')}
            className="gap-2"
          >
            ⚡ Improve
            {typeCounts.improvement > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                {typeCounts.improvement}
              </span>
            )}
          </Button>
          <Button
            variant={typeFilter === 'pattern' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('pattern')}
            className="gap-2"
          >
            🎯 Patterns
            {typeCounts.pattern > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                {typeCounts.pattern}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status Filters - Secondary */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status:</span>
          <Button
            variant={filter === 'pending' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            ⏳ Pending
          </Button>
          <Button
            variant={filter === 'accepted' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('accepted')}
          >
            ✅ Accepted
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            ❌ Rejected
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Aucune suggestion pour ce filtre</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 flex-1">
              {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{getTypeIcon(suggestion.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {suggestion.suggestion?.name || `Suggestion ${suggestion.type}`}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        {/* Target Folder */}
                        {suggestion.suggestion?.target_folder && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">📂 Target:</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
                              {suggestion.suggestion.target_folder}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {suggestion.type}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {expandedId === suggestion.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === suggestion.id && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(suggestion.suggestion, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  {suggestion.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleDecision(suggestion.id, 'accept')}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check size={16} />
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openModifyDialog(suggestion)}
                        className="flex items-center gap-1"
                      >
                        <Edit2 size={16} />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDecision(suggestion.id, 'reject')}
                        className="flex items-center gap-1"
                      >
                        <X size={16} />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 rounded-lg mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalCount} résultat{totalCount > 1 ? 's' : ''} • Page {currentPage} / {Math.ceil(totalCount / itemsPerPage) || 1}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* Modify Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la suggestion</DialogTitle>
            <DialogDescription>
              Modifiez les données JSON puis acceptez la suggestion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={modifiedData}
              onChange={(e) => setModifiedData(e.target.value)}
              className="w-full h-64 p-3 font-mono text-sm border rounded-lg bg-gray-50 dark:bg-gray-900"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModifyDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleModify} className="bg-green-600 hover:bg-green-700">
                Accepter avec modifications
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
