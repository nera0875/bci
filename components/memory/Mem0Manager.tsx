'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Tag,
  Calendar,
  User,
  Bot,
  History,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  RefreshCw,
  Download,
  Upload,
  Folder,
  FolderOpen,
  Hash,
  Clock,
  AlertCircle,
  CheckCircle2,
  Grid,
  List,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Memory {
  id: string
  memory: string
  categories?: string[]
  metadata?: any
  created_at: string
  updated_at: string
  user_id?: string
  agent_id?: string
  run_id?: string
  app_id?: string
}

interface MemoryCategory {
  name: string
  icon: React.ElementType
  color: string
  count: number
  subcategories?: string[]
}

const DEFAULT_CATEGORIES: MemoryCategory[] = [
  { name: 'personal_information', icon: User, color: 'blue', count: 0 },
  { name: 'preferences', icon: Heart, color: 'red', count: 0 },
  { name: 'technical_knowledge', icon: Brain, color: 'purple', count: 0 },
  { name: 'conversations', icon: MessageSquare, color: 'green', count: 0 },
  { name: 'tasks', icon: CheckCircle2, color: 'yellow', count: 0 },
  { name: 'relationships', icon: Users, color: 'pink', count: 0 },
  { name: 'locations', icon: MapPin, color: 'orange', count: 0 },
  { name: 'events', icon: Calendar, color: 'indigo', count: 0 }
]

export default function Mem0Manager({ projectId }: { projectId: string }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [categories, setCategories] = useState<MemoryCategory[]>(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [newMemory, setNewMemory] = useState({ content: '', categories: [] })
  const [loading, setLoading] = useState(false)
  const [selectedMemories, setSelectedMemories] = useState<string[]>([])
  const [expandedMemories, setExpandedMemories] = useState<string[]>([])

  // Filters
  const [filters, setFilters] = useState({
    user_id: '',
    agent_id: '',
    date_from: '',
    date_to: '',
    categories: [] as string[],
    metadata: {}
  })

  // Load memories
  const loadMemories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/get-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          filters: buildFilters(),
          page: 1,
          page_size: 100
        })
      })
      const data = await response.json()
      setMemories(data.memories || [])
      updateCategoryCounts(data.memories || [])
    } catch (error) {
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  // Build filters for API
  const buildFilters = () => {
    const apiFilters: any = { AND: [] }

    if (filters.user_id) {
      apiFilters.AND.push({ user_id: filters.user_id })
    }
    if (filters.agent_id) {
      apiFilters.AND.push({ agent_id: filters.agent_id })
    }
    if (filters.date_from || filters.date_to) {
      const dateFilter: any = { created_at: {} }
      if (filters.date_from) dateFilter.created_at.gte = filters.date_from
      if (filters.date_to) dateFilter.created_at.lte = filters.date_to
      apiFilters.AND.push(dateFilter)
    }
    if (filters.categories.length > 0) {
      apiFilters.AND.push({ categories: { in: filters.categories } })
    }

    return apiFilters.AND.length > 0 ? apiFilters : undefined
  }

  // Add new memory
  const addMemory = async () => {
    if (!newMemory.content) return

    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: [{ role: 'user', content: newMemory.content }],
          user_id: `user_${projectId}`,
          metadata: { categories: newMemory.categories }
        })
      })
      const data = await response.json()
      toast.success('Memory added successfully')
      setNewMemory({ content: '', categories: [] })
      loadMemories()
    } catch (error) {
      toast.error('Failed to add memory')
    } finally {
      setLoading(false)
    }
  }

  // Update memory
  const updateMemory = async (memory: Memory) => {
    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_id: memory.id,
          text: memory.memory,
          metadata: memory.metadata
        })
      })
      toast.success('Memory updated')
      loadMemories()
      setEditingMemory(null)
    } catch (error) {
      toast.error('Failed to update memory')
    } finally {
      setLoading(false)
    }
  }

  // Delete memory
  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return

    setLoading(true)
    try {
      await fetch('/api/memory/v5/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId })
      })
      toast.success('Memory deleted')
      loadMemories()
    } catch (error) {
      toast.error('Failed to delete memory')
    } finally {
      setLoading(false)
    }
  }

  // Batch delete
  const batchDelete = async () => {
    if (selectedMemories.length === 0) return
    if (!confirm(`Delete ${selectedMemories.length} memories?`)) return

    setLoading(true)
    try {
      await fetch('/api/memory/v5/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_ids: selectedMemories
        })
      })
      toast.success(`${selectedMemories.length} memories deleted`)
      setSelectedMemories([])
      loadMemories()
    } catch (error) {
      toast.error('Failed to delete memories')
    } finally {
      setLoading(false)
    }
  }

  // Search memories
  const searchMemories = async () => {
    if (!searchQuery) {
      loadMemories()
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          query: searchQuery,
          filters: buildFilters()
        })
      })
      const data = await response.json()
      setMemories(data.results || [])
    } catch (error) {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Update category counts
  const updateCategoryCounts = (mems: Memory[]) => {
    const counts: Record<string, number> = {}
    mems.forEach(mem => {
      mem.categories?.forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1
      })
    })

    setCategories(cats => cats.map(cat => ({
      ...cat,
      count: counts[cat.name] || 0
    })))
  }

  // Memory card component
  const MemoryCard = ({ memory }: { memory: Memory }) => {
    const isExpanded = expandedMemories.includes(memory.id)
    const isSelected = selectedMemories.includes(memory.id)
    const isEditing = editingMemory?.id === memory.id

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-gray-900/50 border rounded-xl p-4 hover:border-gray-700 transition-all ${
          isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMemories([...selectedMemories, memory.id])
                } else {
                  setSelectedMemories(selectedMemories.filter(id => id !== memory.id))
                }
              }}
              className="rounded border-gray-600"
            />
            <button
              onClick={() => {
                if (isExpanded) {
                  setExpandedMemories(expandedMemories.filter(id => id !== memory.id))
                } else {
                  setExpandedMemories([...expandedMemories, memory.id])
                }
              }}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-gray-500">#{memory.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingMemory(memory)}
              className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteMemory(memory.id)}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editingMemory.memory}
              onChange={(e) => setEditingMemory({ ...editingMemory, memory: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateMemory(editingMemory)}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => setEditingMemory(null)}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-gray-300 text-sm ${!isExpanded ? 'line-clamp-2' : ''}`}>
            {memory.memory}
          </p>
        )}

        {/* Categories */}
        {memory.categories && memory.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {memory.categories.map(cat => (
              <span
                key={cat}
                className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Metadata (when expanded) */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              {memory.user_id && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {memory.user_id}
                </span>
              )}
              {memory.agent_id && (
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {memory.agent_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created: {new Date(memory.created_at).toLocaleDateString()}
              </span>
              {memory.updated_at !== memory.created_at && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Updated: {new Date(memory.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  useEffect(() => {
    loadMemories()
  }, [projectId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Mem0 Memory Manager</h2>
              <p className="text-gray-400 text-sm">Complete control over your AI memories</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'timeline' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Total Memories</p>
            <p className="text-2xl font-bold text-white">{memories.length}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Categories</p>
            <p className="text-2xl font-bold text-white">{categories.filter(c => c.count > 0).length}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Selected</p>
            <p className="text-2xl font-bold text-white">{selectedMemories.length}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Status</p>
            <p className="text-sm font-medium text-green-400">Connected</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMemories()}
              placeholder="Search memories..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={searchMemories}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          {selectedMemories.length > 0 && (
            <button
              onClick={batchDelete}
              className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete Selected ({selectedMemories.length})
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="User ID"
                  value={filters.user_id}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="text"
                  placeholder="Agent ID"
                  value={filters.agent_id}
                  onChange={(e) => setFilters({ ...filters, agent_id: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <button
                onClick={loadMemories}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Apply Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Categories Sidebar + Content */}
      <div className="flex gap-4">
        {/* Categories */}
        <div className="w-64 space-y-2">
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => {
                const Icon = category.icon
                return (
                  <button
                    key={category.name}
                    onClick={() => {
                      if (selectedCategory === category.name) {
                        setSelectedCategory(null)
                        setFilters({ ...filters, categories: [] })
                      } else {
                        setSelectedCategory(category.name)
                        setFilters({ ...filters, categories: [category.name] })
                      }
                      loadMemories()
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      selectedCategory === category.name
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'hover:bg-gray-800 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">
                      {category.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add Memory */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Add Memory</h3>
            <textarea
              value={newMemory.content}
              onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
              placeholder="Enter new memory..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm resize-none"
              rows={3}
            />
            <button
              onClick={addMemory}
              disabled={!newMemory.content || loading}
              className="w-full mt-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Memory
            </button>
          </div>
        </div>

        {/* Memories Grid/List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : memories.length === 0 ? (
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-12 text-center">
              <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No memories found</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-4'
                : viewMode === 'list'
                ? 'space-y-4'
                : 'space-y-4'
            }>
              <AnimatePresence mode="popLayout">
                {memories.map(memory => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Import missing icons
import { Heart, MessageSquare, Users, MapPin } from 'lucide-react'