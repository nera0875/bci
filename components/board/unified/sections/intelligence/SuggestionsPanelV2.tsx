'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronRight, Edit2, Check, X, Sparkles,
  Shield, Database, TrendingUp, AlertTriangle, Info,
  Zap, Target, Brain, FileText, Code, Eye, ChevronLeft
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Suggestion {
  id: string
  project_id: string
  type: 'rule' | 'pattern' // OPTIMIZED: only 2 types (storage/improvement disabled)
  status: 'pending' | 'accepted' | 'rejected'
  suggestion: any
  confidence: number
  created_at: string
}

interface SuggestionsPanelV2Props {
  projectId: string
}

// OPTIMIZED: Only 'rule' and 'pattern' types enabled (storage/improvement disabled)
const typeConfig = {
  rule: {
    icon: Shield,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Rule',
    emoji: '🛡️'
  },
  pattern: {
    icon: Brain,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'Pattern',
    emoji: '🎯'
  }
}

export default function SuggestionsPanelV2({ projectId }: SuggestionsPanelV2Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending')
  const [typeFilter, setTypeFilter] = useState<'all' | 'rule' | 'pattern'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null)
  const [editedData, setEditedData] = useState<any>({})
  const [editMode, setEditMode] = useState<'form' | 'json'>('form')
  const [currentPage, setCurrentPage] = useState(1)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    loadSuggestions()
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [projectId, filter, typeFilter])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('suggestions_queue')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

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

      // Update status
      await supabase
        .from('suggestions_queue')
        .update({ status: decision === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', id)

      // Track decision
      await supabase
        .from('user_decisions')
        .insert({
          project_id: projectId,
          decision_type: decision,
          proposed_action: modifiedData || suggestion.suggestion,
          user_choice: decision === 'accept' ? 'accept' : 'reject',
          confidence_score: suggestion.confidence
        })

      // Execute if accepted
      if (decision === 'accept') {
        await executeSuggestion(suggestion, modifiedData)
      }

      toast.success(`Suggestion ${decision === 'accept' ? 'acceptée' : 'rejetée'}`)
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
        case 'rule':
          await supabase.from('rules').insert({
            project_id: projectId,
            name: finalData.title || 'New Rule',
            trigger_type: 'context',
            trigger_config: finalData.trigger || {},
            action_type: 'test',
            action_config: finalData.action || {},
            enabled: false,
            metadata: { auto_created: true }
          })
          toast.success('🛡️ Règle créée!')
          break

        case 'pattern':
          await supabase.from('learned_patterns').insert({
            project_id: projectId,
            pattern_data: finalData,
            confidence: suggestion.confidence,
            evidence_count: 1,
            context: finalData.category || 'general'
          })
          toast.success('🎯 Pattern enregistré!')
          break

        default:
          // storage and improvement types are disabled
          console.warn(`Suggestion type "${suggestion.type}" is disabled`)
          toast.error(`Type "${suggestion.type}" non supporté`)
          break
      }
    } catch (error) {
      console.error('Error executing suggestion:', error)
      throw error
    }
  }

  const openEditDialog = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion)
    setEditedData(suggestion.suggestion)
    setEditMode('form')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingSuggestion) return
    await handleDecision(editingSuggestion.id, 'accept', editedData)
    setEditDialogOpen(false)
  }

  const handleRegenerate = async (suggestion: Suggestion) => {
    try {
      setRegenerating(suggestion.id)

      // Delete current suggestion
      await supabase
        .from('suggestions_queue')
        .delete()
        .eq('id', suggestion.id)

      // Generate variation (this would ideally call an AI endpoint)
      // For now, we'll create a placeholder variation
      const variation = {
        ...suggestion.suggestion,
        title: `${suggestion.suggestion.title} (Variation)`,
        description: `Alternative approach: ${suggestion.suggestion.description}`
      }

      // Insert variation
      await supabase
        .from('suggestions_queue')
        .insert({
          project_id: projectId,
          type: suggestion.type,
          confidence: suggestion.confidence,
          suggestion: variation,
          metadata: {
            ...suggestion.metadata,
            regenerated_from: suggestion.id,
            generation_count: (suggestion.metadata?.generation_count || 0) + 1
          },
          status: 'pending'
        })

      toast.success('🔄 Suggestion régénérée !')
      await loadSuggestions()
    } catch (error) {
      console.error('Error regenerating:', error)
      toast.error('Erreur régénération')
    } finally {
      setRegenerating(null)
    }
  }

  const renderSuggestionCard = (suggestion: Suggestion) => {
    const config = typeConfig[suggestion.type]
    const Icon = config.icon

    return (
      <motion.div
        key={suggestion.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative rounded-xl border-2 transition-all hover:shadow-lg",
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Icon & Type */}
            <div className="flex items-start gap-4">
              <div className={cn(
                "rounded-lg p-3 bg-gradient-to-br shadow-lg",
                config.color
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1">
                {/* Title & Confidence */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {suggestion.suggestion?.title || `${config.label} Suggestion`}
                  </h3>
                  <Badge variant="outline" className={cn(
                    "font-bold",
                    suggestion.confidence >= 0.8 ? "border-green-500 text-green-600" :
                    suggestion.confidence >= 0.6 ? "border-yellow-500 text-yellow-600" :
                    "border-gray-500 text-gray-600"
                  )}>
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {suggestion.suggestion?.description || 'No description'}
                </p>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2">
                  {suggestion.suggestion?.category && (
                    <Badge variant="secondary" className="text-xs">
                      📁 {suggestion.suggestion.category}
                    </Badge>
                  )}
                  {suggestion.suggestion?.impact && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        suggestion.suggestion.impact === 'high' ? "border-red-500 text-red-600" :
                        suggestion.suggestion.impact === 'medium' ? "border-orange-500 text-orange-600" :
                        "border-gray-500 text-gray-600"
                      )}
                    >
                      {suggestion.suggestion.impact === 'high' ? '🔴' :
                       suggestion.suggestion.impact === 'medium' ? '🟠' : '⚪'} {suggestion.suggestion.impact}
                    </Badge>
                  )}
                  {suggestion.suggestion?.severity && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠️ {suggestion.suggestion.severity}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Expand Button */}
            <button
              onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {expandedId === suggestion.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {expandedId === suggestion.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                {/* Render based on type */}
                {suggestion.type === 'pattern' && renderPatternDetails(suggestion)}
                {suggestion.type === 'rule' && renderRuleDetails(suggestion)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {suggestion.status === 'pending' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                size="sm"
                onClick={() => handleDecision(suggestion.id, 'accept')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Accepter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditDialog(suggestion)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Modifier
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRegenerate(suggestion)}
                disabled={regenerating === suggestion.id}
                className="text-purple-600 hover:text-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {regenerating === suggestion.id ? 'Régénération...' : 'Régénérer'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDecision(suggestion.id, 'reject')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const renderPatternDetails = (suggestion: Suggestion) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Type d'attaque</p>
          <p className="font-medium">{suggestion.suggestion?.attack_type || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Endpoint</p>
          <p className="font-medium font-mono text-sm">{suggestion.suggestion?.endpoint || 'N/A'}</p>
        </div>
      </div>
      {suggestion.suggestion?.payload && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Payload suggéré</p>
          <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            {suggestion.suggestion.payload}
          </pre>
        </div>
      )}
    </div>
  )

  const renderRuleDetails = (suggestion: Suggestion) => (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Déclencheur</p>
        <p className="text-sm">{suggestion.suggestion?.trigger || 'Non défini'}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Action</p>
        <p className="text-sm">{suggestion.suggestion?.action || 'Non définie'}</p>
      </div>
    </div>
  )

  const renderStorageDetails = (suggestion: Suggestion) => (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Contenu</p>
        <p className="text-sm line-clamp-3">{suggestion.suggestion?.content || suggestion.suggestion?.description}</p>
      </div>
      {suggestion.suggestion?.target_folder && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Dossier cible</p>
          <Badge variant="outline">{suggestion.suggestion.target_folder}</Badge>
        </div>
      )}
    </div>
  )

  const renderImprovementDetails = (suggestion: Suggestion) => (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Amélioration proposée</p>
        <p className="text-sm">{suggestion.suggestion?.description}</p>
      </div>
      {suggestion.suggestion?.expected_impact && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Impact attendu</p>
          <p className="text-sm">{suggestion.suggestion.expected_impact}</p>
        </div>
      )}
    </div>
  )

  const renderEditForm = () => {
    if (!editingSuggestion) return null

    return (
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label>Titre</Label>
          <Input
            value={editedData.title || ''}
            onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
            placeholder="Titre de la suggestion"
          />
        </div>

        {/* Description */}
        <div>
          <Label>Description</Label>
          <Textarea
            value={editedData.description || ''}
            onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
            placeholder="Description détaillée"
            rows={4}
          />
        </div>

        {/* Category */}
        <div>
          <Label>Catégorie</Label>
          <Input
            value={editedData.category || ''}
            onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
            placeholder="ex: auth, api, business_logic"
          />
        </div>

        {/* Impact */}
        <div>
          <Label>Impact</Label>
          <Select
            value={editedData.impact || 'medium'}
            onValueChange={(value) => setEditedData({ ...editedData, impact: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">🔴 High</SelectItem>
              <SelectItem value="medium">🟠 Medium</SelectItem>
              <SelectItem value="low">⚪ Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type-specific fields */}
        {editingSuggestion.type === 'pattern' && (
          <>
            <div>
              <Label>Type d'attaque</Label>
              <Input
                value={editedData.attack_type || ''}
                onChange={(e) => setEditedData({ ...editedData, attack_type: e.target.value })}
                placeholder="SQLi, XSS, IDOR..."
              />
            </div>
            <div>
              <Label>Endpoint</Label>
              <Input
                value={editedData.endpoint || ''}
                onChange={(e) => setEditedData({ ...editedData, endpoint: e.target.value })}
                placeholder="/api/users/{id}"
              />
            </div>
          </>
        )}

        {editingSuggestion.type === 'storage' && (
          <div>
            <Label>Contenu</Label>
            <Textarea
              value={editedData.content || ''}
              onChange={(e) => setEditedData({ ...editedData, content: e.target.value })}
              placeholder="Contenu du document"
              rows={6}
            />
          </div>
        )}
      </div>
    )
  }

  // Pagination calculations
  const totalPages = Math.ceil(suggestions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedSuggestions = suggestions.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header with Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Suggestions Intelligentes
          </h2>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-sm font-semibold",
                suggestions.filter(s => s.status === 'pending').length >= 5
                  ? "border-red-500 text-red-600 dark:text-red-400"
                  : "border-blue-500 text-blue-600"
              )}
            >
              {suggestions.filter(s => s.status === 'pending').length} / 5 pending
            </Badge>
          </div>
        </div>

        {/* Pause message if 5/5 */}
        {suggestions.filter(s => s.status === 'pending').length >= 5 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  ⚠️ System Paused (5/5 pending)
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Review and accept/reject existing suggestions before getting new ones. This prevents suggestion spam and ensures quality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Type Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(typeConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={typeFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(key as any)}
              className="gap-1"
            >
              {config.emoji} {config.label}
            </Button>
          ))}
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            Tous
          </Button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={filter === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            En attente
          </Button>
          <Button
            variant={filter === 'accepted' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('accepted')}
          >
            Acceptées
          </Button>
          <Button
            variant={filter === 'rejected' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            Rejetées
          </Button>
        </div>
      </div>

      {/* Suggestions Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Brain className="w-12 h-12 mb-3 opacity-20" />
            <p>Aucune suggestion disponible</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {paginatedSuggestions.map(renderSuggestionCard)}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {suggestions.length} suggestions
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Modifier la suggestion
            </DialogTitle>
          </DialogHeader>

          <Tabs value={editMode} onValueChange={(v) => setEditMode(v as any)} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="form">
                <FileText className="w-4 h-4 mr-2" />
                Formulaire
              </TabsTrigger>
              <TabsTrigger value="json">
                <Code className="w-4 h-4 mr-2" />
                JSON
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="form" className="m-0">
                {renderEditForm()}
              </TabsContent>
              <TabsContent value="json" className="m-0">
                <Textarea
                  value={JSON.stringify(editedData, null, 2)}
                  onChange={(e) => {
                    try {
                      setEditedData(JSON.parse(e.target.value))
                    } catch {}
                  }}
                  className="font-mono text-sm"
                  rows={20}
                />
              </TabsContent>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-1" />
                Valider les modifications
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}