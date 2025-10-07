'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus, RefreshCw, Search, Trash2, X,
  ChevronDown, ChevronRight, Filter,
  Save, Calendar, Tag, Edit2, GripVertical,
  CheckSquare, Square
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CategoryPanel, type Category, TagManagementPanel, type TagTemplate } from '@/components/shared'
import { TagPicker } from '@/components/memory/TagPicker'

interface Fact {
  id: string
  fact: string
  metadata: {
    type: string
    technique?: string | null
    endpoint?: string | null
    method?: string | null
    params?: Record<string, any>
    result?: string | null
    severity?: string | null
    category?: string | null
    position?: number
    confidence: number
    tags?: string[]
  }
  created_at: string
  updated_at: string
}

interface FactsMemoryViewProProps {
  projectId: string
}

// Catégorie draggable + droppable
function SortableCategory({
  category,
  label,
  icon,
  count,
  isExpanded,
  onToggle,
  onDragOver,
  onSelectAll,
  allSelected,
  children
}: {
  category: string
  label: string
  icon: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  onDragOver?: (category: string) => void
  onSelectAll?: () => void
  allSelected?: boolean
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `category-${category}`,
    data: { type: 'category', category }
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${category}`,
    data: { category }
  })

  // Notifier quand on survole avec un fact (via ref callback pour meilleure détection)
  const dropRef = (node: HTMLDivElement | null) => {
    setDroppableRef(node)
    if (node && isOver && onDragOver) {
      onDragOver(category)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? '0.98' : '1'
  }

  // Déclencher onDragOver quand isOver change
  useEffect(() => {
    if (isOver && onDragOver) {
      onDragOver(category)
    }
  }, [isOver])

  return (
    <div ref={setSortableRef} style={style} className="transition-all duration-200">
      <div
        ref={setDroppableRef}
        className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-200 ${
          isOver ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg scale-[1.02]' : 'hover:shadow-md'
        }`}
      >
        {/* Category Header */}
        <div className="flex items-center">
          {/* Drag handle pour catégorie (désactivé pour "uncategorized") */}
          {category !== 'uncategorized' ? (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 group/handle"
              title="Drag to reorder category"
            >
              <GripVertical size={18} className="text-gray-400 group-hover/handle:text-blue-500 transition-colors" />
            </div>
          ) : (
            <div className="p-3">
              <GripVertical size={18} className="text-gray-300 opacity-30 cursor-not-allowed" />
            </div>
          )}

          <button
            onClick={onToggle}
            className="flex-1 px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500 transition-transform duration-200" />
              )}
              <span className="text-2xl transition-transform duration-150 hover:scale-110">{icon}</span>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {label}
                </h3>
                <p className="text-xs text-gray-500">
                  {count} fact{count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-800">{count}</Badge>
            </div>
          </button>

          {/* Select All button (outside toggle button to avoid nested buttons) */}
          {onSelectAll && count > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelectAll()
              }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline px-3 py-2 mr-2 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors whitespace-nowrap"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Facts in Category */}
        {isExpanded && children}
      </div>
    </div>
  )
}

// Composant draggable pour un fact
function SortableFact({
  fact,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
  getSeverityColor,
  getTagColor,
  tagTemplates,
  isOver,
  overId,
  isLastDropped
}: {
  fact: Fact
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onCheck: (e: React.MouseEvent) => void
  getSeverityColor: (severity: string | null | undefined) => string
  getTagColor: (tagName: string) => {bg: string, text: string, border: string}
  tagTemplates: Array<{id: string, name: string, color: string}>
  isOver?: boolean
  overId?: string | null
  isLastDropped?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: fact.id,
    data: { category: fact.metadata.category }
  })

  // Indicateur d'insertion (ligne bleue au-dessus quand on survole)
  const showInsertionIndicator = isOver && overId === fact.id && !isDragging

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 150ms ease',
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? '0.95' : '1'
  }

  return (
    <div className="relative">
      {/* Ligne d'insertion bleue au-dessus */}
      {showInsertionIndicator && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-50 animate-pulse">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-150 ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
        } ${isDragging ? 'z-50' : ''} ${showInsertionIndicator ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${isLastDropped && !isDragging ? 'bg-blue-100/30 dark:bg-blue-800/20' : ''} ${isChecked ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
      >
        {/* Checkbox */}
        <div
          onClick={onCheck}
          className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all flex-shrink-0"
        >
          {isChecked ? (
            <CheckSquare size={18} className="text-purple-600 dark:text-purple-400" />
          ) : (
            <Square size={18} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
          )}
        </div>

        {/* Drag handle - Always visible */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all duration-150 flex-shrink-0 group/handle hover:scale-110"
          title="Drag to reorder or move to another category"
        >
          <GripVertical size={18} className="text-gray-400 group-hover/handle:text-blue-500 transition-colors" />
        </div>

        {/* Content */}
        <div onClick={onSelect} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {fact.metadata.severity && (
              <Badge className={`text-xs ${getSeverityColor(fact.metadata.severity)}`}>
                ● {fact.metadata.severity.toUpperCase()}
              </Badge>
            )}
            {/* Tags directement visibles avec couleur - TRIÉS selon ordre Manage Tags */}
            {fact.metadata.tags && fact.metadata.tags.length > 0 && (() => {
              // Trier les tags selon l'ordre défini dans tagTemplates (drag & drop global)
              // Si tagTemplates pas encore chargé, afficher dans l'ordre d'origine
              const sortedTags = (!tagTemplates || tagTemplates.length === 0)
                ? fact.metadata.tags
                : [...fact.metadata.tags].sort((a, b) => {
                    const indexA = tagTemplates.findIndex(t => t.name === a)
                    const indexB = tagTemplates.findIndex(t => t.name === b)
                    // Tags inconnus à la fin
                    if (indexA === -1 && indexB === -1) return 0
                    if (indexA === -1) return 1
                    if (indexB === -1) return -1
                    return indexA - indexB
                  })

              return sortedTags.map(tag => {
                const colorClasses = getTagColor(tag)
                return (
                  <span
                    key={tag}
                    className={`text-xs px-2 py-0.5 rounded-full border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}
                  >
                    {tag}
                  </span>
                )
              })
            })()}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {fact.fact}
          </p>
          {fact.metadata.endpoint && (
            <p className="text-xs text-gray-500 font-mono mb-1">
              {fact.metadata.method} {fact.metadata.endpoint}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="text-xs text-gray-400">
          {new Date(fact.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

export default function FactsMemoryViewPro({ projectId }: FactsMemoryViewProProps) {
  console.log('🚀 FactsMemoryViewPro WITH DRAG & DROP LOADED!')

  const [facts, setFacts] = useState<Fact[]>([])
  const [filteredFacts, setFilteredFacts] = useState<Fact[]>([])
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null)
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryOrder, setCategoryOrder] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [lastDroppedFactId, setLastDroppedFactId] = useState<string | null>(null)
  const expandTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedFact, setEditedFact] = useState('')
  const [editedType, setEditedType] = useState('')
  const [editedTechnique, setEditedTechnique] = useState('')
  const [editedSeverity, setEditedSeverity] = useState('')
  const [editedCategory, setEditedCategory] = useState('')
  const [editedTags, setEditedTags] = useState<string[]>([])

  // Category management state
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [customCategories, setCustomCategories] = useState<Array<{key: string, label: string, icon: string, description?: string}>>([])
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null)

  // Tag management state
  const [isManagingTags, setIsManagingTags] = useState(false)
  const [tagTemplates, setTagTemplates] = useState<Array<{id: string, name: string, color: string}>>([])

  // Show/hide uncategorized facts
  const [showUncategorized, setShowUncategorized] = useState(true)

  // Color classes mapping - DARK & BOLD pour meilleure visibilité
  const TAG_COLORS: Record<string, {bg: string, text: string, border: string}> = {
    blue: { bg: 'bg-blue-500/20 dark:bg-blue-500/30', text: 'text-blue-800 dark:text-blue-200 font-semibold', border: 'border-blue-500/40' },
    green: { bg: 'bg-green-500/20 dark:bg-green-500/30', text: 'text-green-800 dark:text-green-200 font-semibold', border: 'border-green-500/40' },
    purple: { bg: 'bg-purple-500/20 dark:bg-purple-500/30', text: 'text-purple-800 dark:text-purple-200 font-semibold', border: 'border-purple-500/40' },
    orange: { bg: 'bg-orange-500/20 dark:bg-orange-500/30', text: 'text-orange-800 dark:text-orange-200 font-semibold', border: 'border-orange-500/40' },
    pink: { bg: 'bg-pink-500/20 dark:bg-pink-500/30', text: 'text-pink-800 dark:text-pink-200 font-semibold', border: 'border-pink-500/40' },
    yellow: { bg: 'bg-yellow-500/20 dark:bg-yellow-500/30', text: 'text-yellow-900 dark:text-yellow-100 font-semibold', border: 'border-yellow-500/40' },
    red: { bg: 'bg-red-500/20 dark:bg-red-500/30', text: 'text-red-800 dark:text-red-200 font-semibold', border: 'border-red-500/40' },
    gray: { bg: 'bg-gray-500/20 dark:bg-gray-500/30', text: 'text-gray-800 dark:text-gray-200 font-semibold', border: 'border-gray-500/40' }
  }

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  useEffect(() => {
    loadFacts()
    loadCustomCategories()
    loadTagTemplates()

    // Charger l'ordre des catégories depuis localStorage
    const savedOrder = localStorage.getItem(`category_order_${projectId}`)
    if (savedOrder) {
      try {
        setCategoryOrder(JSON.parse(savedOrder))
      } catch (e) {
        console.error('Failed to parse category order:', e)
      }
    }

    // ✅ REALTIME SUBSCRIPTION - Auto-refresh facts when created/updated/deleted
    console.log('🔌 Setting up Realtime subscription for memory_facts')
    const channel = supabase
      .channel(`memory_facts_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_facts',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🔔 Realtime update received:', payload.eventType)

          if (payload.eventType === 'INSERT') {
            console.log('➕ New fact created, reloading...')
            loadFacts()
            toast.success('✨ New fact added!', { duration: 2000 })
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ Fact updated, reloading...')
            loadFacts()
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Fact deleted, reloading...')
            loadFacts()
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [projectId])

  useEffect(() => {
    applyFilters()
  }, [facts, searchQuery, selectedCategory, selectedSeverity])

  const loadFacts = async () => {
    try {
      setLoading(true)
      const { data, error} = await supabase
        .from('memory_facts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFacts(data || [])
    } catch (error: any) {
      console.error('Error loading facts:', error)
      toast.error('Failed to load facts')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomCategories = async () => {
    try {
      // 1. Charger depuis Supabase
      const response = await fetch(`/api/memory/categories?projectId=${projectId}`)
      const data = await response.json()

      if (data.categories) {
        const formatted = data.categories.map((c: any) => ({
          key: c.key,
          label: c.label,
          icon: c.icon,
          description: c.description,
          id: c.id // Garder l'ID pour UPDATE/DELETE
        }))
        setCustomCategories(formatted)

        // 2. Migration auto: Si localStorage existe, migrer vers Supabase
        const localData = localStorage.getItem(`custom_categories_${projectId}`)
        if (localData) {
          const localCategories = JSON.parse(localData)
          console.log('🔄 Migrating', localCategories.length, 'categories from localStorage to Supabase')

          for (const cat of localCategories) {
            // Vérifier si déjà existe
            const exists = formatted.find((c: any) => c.key === cat.key)
            if (!exists) {
              await fetch('/api/memory/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  key: cat.key,
                  label: cat.label,
                  icon: cat.icon
                })
              })
            }
          }

          // Supprimer localStorage après migration
          localStorage.removeItem(`custom_categories_${projectId}`)
          console.log('✅ Migration completed, localStorage cleared')

          // Recharger depuis Supabase
          loadCustomCategories()
        }
      }
    } catch (error) {
      console.error('Error loading custom categories:', error)
      toast.error('Failed to load categories')
    }
  }

  const loadTagTemplates = async () => {
    try {
      const response = await fetch(`/api/tags/templates?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setTagTemplates(data)
      }
    } catch (error) {
      console.error('Error loading tag templates:', error)
    }
  }

  const getTagColor = (tagName: string) => {
    const template = tagTemplates.find(t => t.name === tagName)
    const color = template?.color || 'gray'
    return TAG_COLORS[color] || TAG_COLORS.gray
  }

  const saveCustomCategories = async (categories: Array<{key: string, label: string, icon: string, id?: string}>) => {
    // Utilisé pour UPDATE en batch (rare)
    // Note: Pour CREATE/UPDATE/DELETE individuels, on utilise directement l'API
    setCustomCategories(categories)
  }

  const handleCreateNewFact = () => {
    const newFact: Fact = {
      id: `temp_${Date.now()}`,
      fact: '',
      metadata: {
        type: 'general',
        confidence: 1.0,
        tags: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setSelectedFact(newFact)
    setEditedFact('')
    setEditedType('general')
    setEditedTechnique('')
    setEditedSeverity('')
    setEditedCategory('')
    setEditedTags([])
    setIsEditing(true)
  }

  const applyFilters = () => {
    let result = [...facts]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(f =>
        f.fact.toLowerCase().includes(query) ||
        f.metadata.endpoint?.toLowerCase().includes(query) ||
        f.metadata.technique?.toLowerCase().includes(query) ||
        f.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'uncategorized') {
        result = result.filter(f => !f.metadata.category)
      } else {
        result = result.filter(f => f.metadata.category === selectedCategory)
      }
    }

    if (selectedSeverity !== 'all') {
      result = result.filter(f => f.metadata.severity === selectedSeverity)
    }

    setFilteredFacts(result)
  }

  const groupByCategory = () => {
    const groups: Record<string, Fact[]> = {}
    const validCategories = getAllCategories()

    filteredFacts.forEach(fact => {
      const category = fact.metadata.category || null

      // Collect facts without category into "uncategorized" if enabled
      if (!category) {
        if (showUncategorized) {
          if (!groups['uncategorized']) groups['uncategorized'] = []
          groups['uncategorized'].push(fact)
        }
        return
      }

      // Skip facts whose category no longer exists (deleted from customCategories)
      if (!validCategories[category]) return

      if (!groups[category]) groups[category] = []
      groups[category].push(fact)
    })

    // Trier chaque catégorie par position (ou par date si pas de position)
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => {
        const posA = a.metadata.position ?? 999999
        const posB = b.metadata.position ?? 999999
        if (posA !== posB) return posA - posB
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    })

    // Appliquer l'ordre des catégories si défini
    if (categoryOrder.length > 0) {
      const orderedGroups: Record<string, Fact[]> = {}
      categoryOrder.forEach(cat => {
        if (groups[cat]) orderedGroups[cat] = groups[cat]
      })
      // Ajouter les catégories non ordonnées à la fin
      Object.keys(groups).forEach(cat => {
        if (!orderedGroups[cat]) orderedGroups[cat] = groups[cat]
      })
      return orderedGroups
    }

    return groups
  }

  const getAllCategories = () => {
    const allCats: Record<string, {label: string, icon: string}> = {}

    // 1. D'abord, ajouter toutes les catégories des facts existants
    const categoriesFromFacts = new Set(facts.map(f => f.metadata.category).filter(Boolean))
    categoriesFromFacts.forEach(key => {
      allCats[key] = {label: key, icon: '📁'}
    })

    // 2. Puis, écraser avec les custom (permet de customiser l'icon/label)
    customCategories.forEach(cat => {
      allCats[cat.key] = {label: cat.label, icon: cat.icon}
    })

    // 3. Ajouter la catégorie système "uncategorized" si des facts sans catégorie existent
    const hasUncategorized = facts.some(f => !f.metadata.category)
    if (hasUncategorized && showUncategorized) {
      allCats['uncategorized'] = {label: 'No Category', icon: '📂'}
    }

    return allCats
  }

  const getCategoryIcon = (category: string) => {
    const allCats = getAllCategories()
    return allCats[category]?.icon || '📄'
  }

  const getCategoryLabel = (category: string) => {
    const allCats = getAllCategories()
    return allCats[category]?.label || category
  }

  const getSeverityColor = (severity: string | null | undefined) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-blue-500 text-white'
      case 'info': return 'bg-gray-500 text-white'
      default: return 'bg-gray-300 text-gray-700'
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const openFactForEdit = (fact: Fact) => {
    setSelectedFact(fact)
    setEditedFact(fact.fact)
    setEditedType(fact.metadata.type)
    setEditedTechnique(fact.metadata.technique || '')
    setEditedSeverity(fact.metadata.severity || '')
    setEditedCategory(fact.metadata.category || '')
    setEditedTags(fact.metadata.tags || [])
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!selectedFact) return
    if (!editedFact.trim()) {
      toast.error('Fact content cannot be empty')
      return
    }

    try {
      const updatedFact: Fact = {
        ...selectedFact,
        fact: editedFact,
        metadata: {
          ...selectedFact.metadata,
          type: editedType,
          technique: editedTechnique || null,
          severity: editedSeverity || null,
          category: editedCategory || null,
          tags: editedTags
        }
      }

      // Check if it's a new fact (temp ID)
      if (selectedFact.id.startsWith('temp_')) {
        // Generate embedding for new fact
        let embedding = null
        try {
          const embeddingRes = await fetch('/api/openai/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: updatedFact.fact, projectId })
          })
          if (embeddingRes.ok) {
            const embData = await embeddingRes.json()
            embedding = embData.embedding
          }
        } catch (err) {
          console.warn('Embedding generation failed, fact will be created without embedding:', err)
        }

        const { data, error } = await supabase
          .from('memory_facts')
          .insert({
            project_id: projectId,
            fact: updatedFact.fact,
            metadata: updatedFact.metadata,
            embedding
          })
          .select()
          .single()

        if (error) throw error

        // Force reload to ensure tags are displayed
        await loadFacts()
        toast.success('Fact created' + (embedding ? ' ✅' : ' (no embedding)'))
      } else {
        const { error } = await supabase
          .from('memory_facts')
          .update({
            fact: updatedFact.fact,
            metadata: updatedFact.metadata
          })
          .eq('id', updatedFact.id)

        if (error) throw error

        // Force reload to ensure tags are displayed
        await loadFacts()
        toast.success('Fact updated successfully')
      }

      setSelectedFact(null)
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error saving fact:', error)
      toast.error('Failed to save fact')
    }
  }

  const handleDelete = async () => {
    if (!selectedFact) return
    if (!confirm('Delete this fact?')) return

    try {
      const { error } = await supabase
        .from('memory_facts')
        .delete()
        .eq('id', selectedFact.id)

      if (error) throw error

      setFacts(facts.filter(f => f.id !== selectedFact.id))
      setSelectedFact(null)
      toast.success('Fact deleted')
    } catch (error: any) {
      console.error('Error deleting fact:', error)
      toast.error('Failed to delete fact')
    }
  }

  // Multi-selection functions
  const toggleFactSelection = (factId: string) => {
    const newSelection = new Set(selectedFactIds)
    if (newSelection.has(factId)) {
      newSelection.delete(factId)
    } else {
      newSelection.add(factId)
    }
    setSelectedFactIds(newSelection)
  }

  const selectAllInCategory = (category: string) => {
    const categoryFacts = facts.filter(f => (f.metadata.category || 'uncategorized') === category)
    const newSelection = new Set(selectedFactIds)
    const allSelected = categoryFacts.every(f => newSelection.has(f.id))

    if (allSelected) {
      // Deselect all in category
      categoryFacts.forEach(f => newSelection.delete(f.id))
    } else {
      // Select all in category
      categoryFacts.forEach(f => newSelection.add(f.id))
    }
    setSelectedFactIds(newSelection)
  }

  const clearSelection = () => {
    setSelectedFactIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedFactIds.size === 0) return
    if (!confirm(`Delete ${selectedFactIds.size} selected facts?`)) return

    try {
      const idsToDelete = Array.from(selectedFactIds)

      const { error } = await supabase
        .from('memory_facts')
        .delete()
        .in('id', idsToDelete)

      if (error) throw error

      setFacts(facts.filter(f => !selectedFactIds.has(f.id)))
      setSelectedFactIds(new Set())
      toast.success(`${idsToDelete.length} facts deleted`)
    } catch (error: any) {
      console.error('Error deleting facts:', error)
      toast.error('Failed to delete facts')
    }
  }


  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setDragOverCategory(null)
    setOverId(null)
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current)
      expandTimerRef.current = null
    }
  }

  const handleCategoryDragOver = (category: string) => {
    console.log('🎯 Drag over category:', category, 'activeId:', activeId)

    // Si c'est un fact qui est draggé (pas une catégorie)
    if (activeId && !activeId.toString().startsWith('category-')) {
      setDragOverCategory(category)

      // Auto-expand après 600ms de hover
      if (category && !expandedCategories.has(category)) {
        if (expandTimerRef.current) clearTimeout(expandTimerRef.current)

        console.log('⏱️ Starting timer to expand:', category)
        expandTimerRef.current = setTimeout(() => {
          console.log('✅ Expanding category:', category)
          setExpandedCategories(prev => new Set([...prev, category]))
          toast.info(`📂 ${category} opened`, { duration: 1500 })
        }, 600)
      }
    }
  }

  const handleCategoryDragLeave = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current)
      expandTimerRef.current = null
    }
    setDragOverCategory(null)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    setActiveId(null)
    setDragOverCategory(null)
    setOverId(null)

    // Clear expand timer
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current)
      expandTimerRef.current = null
    }

    if (!over || active.id === over.id) return

    // CAS 1: Drag & drop de catégories
    if (typeof active.id === 'string' && active.id.startsWith('category-')) {
      const activeCategory = active.id.replace('category-', '')
      const overCategory = over.id.replace('category-', '').replace('droppable-', '')

      // Empêcher le drag de la catégorie système "uncategorized"
      if (activeCategory === 'uncategorized' || overCategory === 'uncategorized') {
        return
      }

      const groupedFacts = groupByCategory()
      const categories = Object.keys(groupedFacts)

      const oldIndex = categories.indexOf(activeCategory)
      const newIndex = categories.indexOf(overCategory)

      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(categories, oldIndex, newIndex)
      setCategoryOrder(newOrder)

      // Sauvegarder l'ordre dans localStorage
      localStorage.setItem(`category_order_${projectId}`, JSON.stringify(newOrder))
      toast.success('✓ Category reordered')
      return
    }

    // CAS 2: Drag & drop de facts
    const activeFact = facts.find(f => f.id === active.id)
    if (!activeFact) return

    const activeCategory = activeFact.metadata.category || null

    // Déterminer la catégorie de destination
    let overCategory: string | null = null
    if (over.data?.current?.category) {
      overCategory = over.data.current.category
    } else if (typeof over.id === 'string' && over.id.startsWith('droppable-')) {
      overCategory = over.id.replace('droppable-', '')
    } else if (typeof over.id === 'string' && over.id.startsWith('category-')) {
      overCategory = over.id.replace('category-', '')
    } else {
      // over est un autre fact, prendre sa catégorie
      const overFact = facts.find(f => f.id === over.id)
      overCategory = overFact?.metadata.category || null
    }

    if (!overCategory) return

    // CAS 2a: Déplacement entre catégories différentes
    if (activeCategory !== overCategory) {
      try {
        // Récupérer les facts de la catégorie de destination
        const groupedFacts = groupByCategory()
        const destinationFacts = groupedFacts[overCategory] || []

        // Trouver la position du fact sur lequel on a drop
        let newPosition = 0
        const overFactIndex = destinationFacts.findIndex(f => f.id === over.id)

        if (overFactIndex !== -1) {
          // Insérer à la position du fact survolé
          newPosition = destinationFacts[overFactIndex].metadata.position || overFactIndex
        } else {
          // Si on drop sur la catégorie elle-même, mettre à la fin
          newPosition = destinationFacts.length
        }

        // Si drag vers "uncategorized", mettre category à null
        const targetCategory = overCategory === 'uncategorized' ? null : overCategory

        const { error } = await supabase
          .from('memory_facts')
          .update({
            metadata: { ...activeFact.metadata, category: targetCategory, position: newPosition }
          })
          .eq('id', activeFact.id)

        if (error) throw error

        setFacts(facts.map(f =>
          f.id === activeFact.id
            ? { ...f, metadata: { ...f.metadata, category: overCategory, position: newPosition } }
            : f
        ))
        toast.success(`✓ Moved to ${overCategory}`)
      } catch (error) {
        console.error('Error moving fact:', error)
        toast.error('Failed to move fact')
      }
    }
    // CAS 2b: Réordonnancement dans la même catégorie
    else {
      // Utiliser groupedFacts pour avoir les facts réellement affichés dans cette catégorie
      const groupedFacts = groupByCategory()
      const categoryFacts = groupedFacts[activeCategory] || []

      const oldIndex = categoryFacts.findIndex(f => f.id === active.id)
      const newIndex = categoryFacts.findIndex(f => f.id === over.id)

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      // Réorganiser avec arrayMove
      const reordered = arrayMove(categoryFacts, oldIndex, newIndex)

      // Assigner nouvelles positions
      const updates = reordered.map((fact, index) => ({
        id: fact.id,
        metadata: { ...fact.metadata, position: index }
      }))

      try {
        // Mettre à jour en DB (batch - optimisé)
        const promises = updates.map(update =>
          supabase
            .from('memory_facts')
            .update({ metadata: update.metadata })
            .eq('id', update.id)
        )

        await Promise.all(promises)

        // Mettre à jour state local
        setFacts(prevFacts => prevFacts.map(f => {
          const updated = updates.find(u => u.id === f.id)
          return updated ? { ...f, metadata: updated.metadata } : f
        }))

        toast.success('✓ Reordered')
      } catch (error) {
        console.error('Error reordering facts:', error)
        toast.error('Failed to reorder')
      }
    }

    // Sauvegarder le fact déplacé pour hover bleu permanent (pas pour les catégories)
    if (!active.id.toString().startsWith('category-')) {
      setLastDroppedFactId(active.id as string)
    }
  }

  // Include default + custom categories in dropdown
  const allCategories = getAllCategories()
  const categoriesFromFacts = new Set(facts.map(f => f.metadata.category).filter(Boolean))
  const hasUncategorized = facts.some(f => !f.metadata.category)
  const allCategoryKeys = new Set([...Object.keys(allCategories), ...categoriesFromFacts])

  // Add "uncategorized" to dropdown if facts without category exist
  if (hasUncategorized && showUncategorized) {
    allCategoryKeys.add('uncategorized')
  }

  const uniqueCategories = ['all', ...Array.from(allCategoryKeys)]
  const groupedFacts = groupByCategory()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading facts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedFact ? 'mr-[500px]' : ''} transition-all duration-300`}>
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📊 Memory Facts
                <span className="text-sm font-normal text-gray-500">({filteredFacts.length})</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadFacts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-500" onClick={handleCreateNewFact}>
                <Plus className="w-4 h-4 mr-2" />
                New Fact
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsManagingCategories(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Categories
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsManagingTags(true)}>
                <Tag className="w-4 h-4 mr-2" />
                Tags
              </Button>
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={showUncategorized}
                  onChange={(e) => setShowUncategorized(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Show uncategorized</span>
              </label>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedFactIds.size > 0 && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-600 text-white">
                  {selectedFactIds.size} selected
                </Badge>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedFactIds.size} fact{selectedFactIds.size !== 1 ? 's' : ''} sélectionné{selectedFactIds.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-gray-700 dark:text-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facts, endpoints, tags..."
                className="pl-10"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : getCategoryLabel(cat)}
                </option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {/* Grouped Facts List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          onDragOver={(event) => {
            if (event.over) {
              setOverId(event.over.id as string)

              // Auto-expand catégorie si on passe au-dessus avec un fact
              const overId = event.over.id as string
              if (overId.startsWith('droppable-') || overId.startsWith('category-')) {
                const category = overId.replace('droppable-', '').replace('category-', '')
                handleCategoryDragOver(category)
              }
            }
          }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <SortableContext items={Object.keys(groupedFacts).map(cat => `category-${cat}`)} strategy={verticalListSortingStrategy}>
              {Object.entries(groupedFacts).map(([category, categoryFacts]) => (
                <SortableCategory
                  key={category}
                  category={category}
                  label={getCategoryLabel(category)}
                  icon={getCategoryIcon(category)}
                  count={categoryFacts.length}
                  isExpanded={expandedCategories.has(category)}
                  onToggle={() => toggleCategory(category)}
                  onDragOver={handleCategoryDragOver}
                  onSelectAll={() => selectAllInCategory(category)}
                  allSelected={categoryFacts.every(f => selectedFactIds.has(f.id))}
                >
                  <div className="border-t border-gray-200 dark:border-gray-800">
                    <SortableContext items={categoryFacts.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {categoryFacts.map(fact => (
                        <SortableFact
                          key={fact.id}
                          fact={fact}
                          isSelected={selectedFact?.id === fact.id}
                          isChecked={selectedFactIds.has(fact.id)}
                          onSelect={() => openFactForEdit(fact)}
                          onCheck={(e) => {
                            e.stopPropagation()
                            toggleFactSelection(fact.id)
                          }}
                          getSeverityColor={getSeverityColor}
                          getTagColor={getTagColor}
                          tagTemplates={tagTemplates}
                          isOver={overId === fact.id}
                          overId={overId}
                          isLastDropped={lastDroppedFactId === fact.id}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </SortableCategory>
              ))}
            </SortableContext>

            {filteredFacts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No facts found</p>
              </div>
            )}
          </div>

          {/* DragOverlay pour feedback visuel fluide */}
          <DragOverlay
            dropAnimation={{
              duration: 300,
              easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          >
            {activeId ? (
              typeof activeId === 'string' && activeId.startsWith('category-') ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-blue-500 shadow-2xl p-4 opacity-95 backdrop-blur-sm transform rotate-2 scale-105">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded">
                      <GripVertical size={18} className="text-blue-500" />
                    </div>
                    <span className="text-2xl filter drop-shadow-lg">{getCategoryIcon(activeId.replace('category-', ''))}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{getCategoryLabel(activeId.replace('category-', ''))}</span>
                  </div>
                </div>
              ) : (
                (() => {
                  const fact = facts.find(f => f.id === activeId)
                  return fact ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-blue-500 shadow-2xl p-4 opacity-95 max-w-md backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded">
                          <GripVertical size={16} className="text-blue-500" />
                        </div>
                        <div className="flex-1">
                          {fact.metadata.severity && (
                            <Badge className={`mb-2 ${getSeverityColor(fact.metadata.severity)}`}>
                              {fact.metadata.severity.toUpperCase()}
                            </Badge>
                          )}
                          <p className="text-sm font-medium line-clamp-3 text-gray-900 dark:text-gray-100">{fact.fact}</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Side Panel */}
      {selectedFact && (
        <div className="fixed right-0 top-0 h-full w-[500px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col z-50">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedFact.metadata.severity && (
                <Badge className={`mr-2 ${getSeverityColor(selectedFact.metadata.severity)}`}>
                  {selectedFact.metadata.severity.toUpperCase()}
                </Badge>
              )}
              Fact Details
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedFact(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Fact Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editedFact}
                onChange={(e) => setEditedFact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 min-h-[100px]"
                placeholder="Fact description..."
              />
            </div>

            {/* Category avec bouton + pour créer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📁 Category
              </label>
              <div className="flex gap-2">
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  <option value="">No Category</option>
                  {Object.entries(getAllCategories()).map(([key, {label, icon}]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const newCatLabel = prompt('Category name:')
                    if (!newCatLabel) return

                    const newCatIcon = prompt('Category icon (emoji):', '📁')
                    const newCatKey = newCatLabel.toLowerCase().replace(/\s+/g, '_')

                    try {
                      const response = await fetch('/api/memory/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          projectId,
                          key: newCatKey,
                          label: newCatLabel,
                          icon: newCatIcon || '📁'
                        })
                      })

                      if (response.ok) {
                        await loadCustomCategories()
                        setEditedCategory(newCatKey)
                        toast.success('Category created!')
                      } else {
                        toast.error('Failed to create category')
                      }
                    } catch (error) {
                      toast.error('Failed to create category')
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <select
                value={editedSeverity}
                onChange={(e) => setEditedSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option value="">None</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
                <option value="info">⚪ Info</option>
              </select>
            </div>

            {/* Technique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Technique
              </label>
              <input
                type="text"
                value={editedTechnique}
                onChange={(e) => setEditedTechnique(e.target.value)}
                placeholder="e.g., BizLogic, IDOR, SQLi..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                🏷️ Tags
              </label>
              <TagPicker
                projectId={projectId}
                selectedTags={editedTags}
                onTagsChange={setEditedTags}
              />
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Created: {new Date(selectedFact.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>Updated: {new Date(selectedFact.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Category Management with CategoryPanel */}
      {isManagingCategories && (
        <CategoryPanel
          categories={(() => {
            // Combiner catégories custom + catégories des facts
            const customCats = customCategories.map(c => ({
              id: c.key, // ID stable = key actuel
              value: c.key,
              label: c.label,
              icon: c.icon,
              color: 'gray' as const,
              description: c.description
            }))

            // Trouver catégories qui existent dans les facts mais pas dans custom
            const categoriesFromFacts = new Set(facts.map(f => f.metadata.category).filter(Boolean))
            const customKeys = new Set(customCategories.map(c => c.key))

            const factOnlyCategories = Array.from(categoriesFromFacts)
              .filter(cat => !customKeys.has(cat))
              .map(cat => ({
                id: cat, // ID stable = key actuel
                value: cat,
                label: cat,
                icon: '📁',
                color: 'gray' as const
              }))

            return [...customCats, ...factOnlyCategories]
          })()}
          onSave={async (newCategories) => {
            // Identifier les catégories qui viennent des facts
            const categoriesFromFacts = new Set(facts.map(f => f.metadata.category).filter(Boolean))
            const customKeys = new Set(customCategories.map(c => c.key))

            // Convert Category[] to custom format
            const formatted = newCategories.map(c => ({
              key: c.value,
              label: c.label,
              icon: c.icon,
              description: c.description
            }))

            // DÉTECTER LES RENAMES avec ID stable
            const renames: Record<string, string> = {} // {oldKey: newKey}

            for (const newCat of newCategories) {
              if (newCat.id && newCat.id !== newCat.value) {
                // ID différent du value = RENAME !
                renames[newCat.id] = newCat.value
                console.log(`🔄 RENAME DETECTED: "${newCat.id}" → "${newCat.value}"`)
              }
            }

            // Sync all changes to Supabase (CREATE ou UPDATE toutes les catégories)
            for (const cat of formatted) {
              const existing = customCategories.find(cc => cc.key === cat.key)

              if (existing) {
                // Update existing
                await fetch('/api/memory/categories', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: (existing as any).id,
                    key: cat.key,
                    label: cat.label,
                    icon: cat.icon,
                    description: cat.description
                  })
                })
              } else {
                // Create new (y compris catégories qui venaient des facts)
                await fetch('/api/memory/categories', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    key: cat.key,
                    label: cat.label,
                    icon: cat.icon,
                    description: cat.description
                  })
                })
                console.log(`✅ Category "${cat.key}" created in DB (was from facts)`)
              }
            }

            // Delete removed categories (TOUTES: custom + factOnly)
            // 1. Construire liste complète des catégories affichées AVANT save
            const allFactCategories = new Set(facts.map(f => f.metadata.category).filter(Boolean))
            const allExistingKeys = new Set([...customCategories.map(c => c.key), ...allFactCategories])
            
            // 2. Détecter celles qui ont disparu
            for (const existingKey of allExistingKeys) {
              const stillExists = formatted.find(c => c.key === existingKey)
              if (stillExists) continue // Pas supprimée
              
              // Catégorie supprimée ! Supprimer facts en cascade
              const factsWithCategory = facts.filter(f => f.metadata.category === existingKey)
                
              if (factsWithCategory.length > 0) {
                const confirmed = confirm(
                  `⚠️ Category "${existingKey}" contains ${factsWithCategory.length} fact(s).\n\n` +
                  `Delete category and ALL its facts permanently?\n\n` +
                  `This action CANNOT be undone!`
                )
                
                if (!confirmed) {
                  console.log(`User cancelled deletion of category "${existingKey}"`)
                  continue
                }
                
                // Supprimer tous les facts de cette catégorie
                const factIds = factsWithCategory.map(f => f.id)
                console.log(`🗑️ Deleting ${factIds.length} facts from category "${existingKey}"`)
                
                const { error: deleteError } = await supabase
                  .from('memory_facts')
                  .delete()
                  .in('id', factIds)
                
                if (deleteError) {
                  console.error('❌ Error deleting facts:', deleteError)
                  toast.error(`Failed to delete facts: ${deleteError.message}`)
                  continue
                }
                
                console.log(`✅ ${factsWithCategory.length} facts deleted successfully`)
                toast.success(`🗑️ ${factsWithCategory.length} facts deleted from "${existingKey}"`)
              }
              
              // Supprimer de DB si elle y était
              const dbCategory = customCategories.find(c => c.key === existingKey)
              if (dbCategory && (dbCategory as any).id) {
                await fetch(`/api/memory/categories?id=${(dbCategory as any).id}`, {
                  method: 'DELETE'
                })
              }
            }

            // PROPAGER LES RENAMES AUX FACTS ✅
            if (Object.keys(renames).length > 0) {
              console.log(`🔄 Propagating ${Object.keys(renames).length} rename(s) to facts...`)
              let factsUpdated = 0
              for (const fact of facts) {
                const oldCategory = fact.metadata.category
                if (oldCategory && renames[oldCategory]) {
                  const newCategory = renames[oldCategory]
                  console.log(`  📝 Updating fact ${fact.id}: category "${oldCategory}" → "${newCategory}"`)
                  await supabase
                    .from('memory_facts')
                    .update({
                      metadata: { ...fact.metadata, category: newCategory }
                    })
                    .eq('id', fact.id)
                  factsUpdated++
                }
              }
              toast.success(`Category renamed: ${Object.keys(renames).map(old => `"${old}" → "${renames[old]}"`).join(', ')}. ${factsUpdated} facts updated!`)
            }

            // Reload categories ET facts pour voir les changements
            await Promise.all([loadCustomCategories(), loadFacts()])

            // Petit délai pour être sûr que le state est mis à jour
            await new Promise(resolve => setTimeout(resolve, 100))

            setIsManagingCategories(false)

            // Toast uniquement si pas de rename (sinon déjà affiché)
            if (Object.keys(renames).length === 0) {
              toast.success('Categories saved!')
            }
          }}
          onCancel={() => setIsManagingCategories(false)}
          title="Manage Memory Categories"
        />
      )}

      {/* Tag Management with TagManagementPanel */}
      {isManagingTags && (
        <TagManagementPanel
          tags={tagTemplates.map(t => {
            // Compter usage de chaque tag dans les facts
            const usageCount = facts.filter(f =>
              f.metadata.tags && Array.isArray(f.metadata.tags) && f.metadata.tags.includes(t.name)
            ).length

            return {
              id: t.id,
              name: t.name,
              color: t.color,
              usageCount
            }
          })}
          onSave={async (updatedTags) => {
            // Map oldName -> newName pour update facts
            const nameChanges: Record<string, string> = {}

            for (const newTag of updatedTags) {
              const oldTag = tagTemplates.find(t => t.id === newTag.id)
              if (oldTag && oldTag.name !== newTag.name) {
                nameChanges[oldTag.name] = newTag.name
              }
            }

            // 1. Update tag templates in DB
            for (const tag of updatedTags) {
              const existing = tagTemplates.find(t => t.id === tag.id)
              if (existing) {
                // Update existing
                await fetch('/api/tags/templates', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color
                  })
                })
              } else {
                // Create new
                await fetch('/api/tags/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    name: tag.name,
                    color: tag.color
                  })
                })
              }
            }

            // 2. Delete removed tags
            for (const existing of tagTemplates) {
              const stillExists = updatedTags.find(t => t.id === existing.id)
              if (!stillExists) {
                await fetch(`/api/tags/templates?id=${existing.id}`, {
                  method: 'DELETE'
                })
              }
            }

            // 3. Update facts qui utilisent des tags renommés
            if (Object.keys(nameChanges).length > 0) {
              for (const fact of facts) {
                const factTags = fact.metadata.tags || []
                let updated = false
                const newTags = factTags.map((tagName: string) => {
                  if (nameChanges[tagName]) {
                    updated = true
                    return nameChanges[tagName]
                  }
                  return tagName
                })

                if (updated) {
                  await supabase
                    .from('memory_facts')
                    .update({
                      metadata: { ...fact.metadata, tags: newTags }
                    })
                    .eq('id', fact.id)
                }
              }
            }

            await loadTagTemplates()
            await loadFacts()
            setIsManagingTags(false)
            toast.success('Tags saved!')
          }}
          onCancel={() => setIsManagingTags(false)}
          title="Manage Tags"
        />
      )}
    </div>
  )
}
