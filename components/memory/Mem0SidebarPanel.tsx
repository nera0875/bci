'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Search,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Tag,
  Clock,
  User,
  Bot,
  Folder,
  FolderOpen,
  RefreshCw,
  History,
  Copy,
  Download,
  Upload,
  Filter,
  Sparkles,
  Database,
  Code,
  FileText,
  Settings,
  Layers,
  Grid3x3,
  BarChart3
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
  confidence?: number
  source?: string
}

interface Mem0SidebarPanelProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  userId?: string
  agentId?: string
  conversationId?: string | null
  embedded?: boolean
}

export default function Mem0SidebarPanel({
  isOpen,
  onClose,
  projectId,
  userId = `user_${projectId}`,
  agentId = `agent_${projectId}`,
  conversationId,
  embedded = false
}: Mem0SidebarPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([])
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'agent'>('all')
  const [loading, setLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // New memory form
  const [newMemory, setNewMemory] = useState({
    content: '',
    categories: [] as string[],
    type: 'user' as 'user' | 'agent'
  })

  // Categories with icons and colors
  const categoryConfig = {
    personal_info: { icon: User, color: 'blue' },
    preferences: { icon: Settings, color: 'purple' },
    technical: { icon: Code, color: 'green' },
    tasks: { icon: FileText, color: 'yellow' },
    context: { icon: Layers, color: 'pink' },
    relationships: { icon: User, color: 'indigo' },
    learning: { icon: Brain, color: 'orange' },
    custom: { icon: Tag, color: 'gray' }
  }

  // Load memories
  const loadMemories = async () => {
    setLoading(true)
    try {
      const filters: any = { AND: [] }

      if (activeTab === 'user') {
        filters.AND.push({ user_id: userId })
      } else if (activeTab === 'agent') {
        filters.AND.push({ agent_id: agentId })
      } else {
        filters.OR = [
          { user_id: userId },
          { agent_id: agentId }
        ]
      }

      if (selectedCategories.length > 0) {
        filters.AND.push({ categories: { in: selectedCategories } })
      }

      const response = await fetch('/api/memory/v5/get-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          filters: filters.AND.length > 0 || filters.OR ? filters : undefined,
          page: 1,
          page_size: 100,
          output_format: 'v1.1'
        })
      })

      if (!response.ok) {
        console.error('Failed to load memories:', response.status)
        setMemories([])
        setFilteredMemories([])
        return
      }

      const text = await response.text()
      if (!text) {
        setMemories([])
        setFilteredMemories([])
        return
      }

      try {
        const data = JSON.parse(text)
        const mems = data.results || data.memories || []
        setMemories(mems)
        setFilteredMemories(mems)
      } catch (error) {
        console.error('Failed to parse memories:', error)
        setMemories([])
        setFilteredMemories([])
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  // Search memories
  const handleSearch = async () => {
    if (!searchQuery) {
      setFilteredMemories(memories)
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
          user_id: activeTab === 'user' ? userId : undefined,
          agent_id: activeTab === 'agent' ? agentId : undefined,
          limit: 50
        })
      })

      const data = await response.json()
      setFilteredMemories(data.results || [])
    } catch (error) {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Add memory
  const handleAddMemory = async () => {
    if (!newMemory.content) return

    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: [
            {
              role: newMemory.type === 'user' ? 'user' : 'assistant',
              content: newMemory.content
            }
          ],
          user_id: newMemory.type === 'user' ? userId : undefined,
          agent_id: newMemory.type === 'agent' ? agentId : undefined,
          metadata: {
            categories: newMemory.categories,
            source: 'manual_entry',
            created_via: 'sidebar_panel'
          }
        })
      })

      if (response.ok) {
        toast.success('Memory added successfully')
        setNewMemory({ content: '', categories: [], type: 'user' })
        loadMemories()
      }
    } catch (error) {
      toast.error('Failed to add memory')
    } finally {
      setLoading(false)
    }
  }

  // Update memory
  const handleUpdateMemory = async () => {
    if (!editingMemory) return

    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_id: editingMemory.id,
          text: editingMemory.memory,
          metadata: {
            ...editingMemory.metadata,
            categories: editingMemory.categories,
            updated_via: 'sidebar_panel'
          }
        })
      })

      if (response.ok) {
        toast.success('Memory updated')
        loadMemories()
        setEditingMemory(null)
      }
    } catch (error) {
      toast.error('Failed to update memory')
    } finally {
      setLoading(false)
    }
  }

  // Delete memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/memory/v5/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId })
      })

      if (response.ok) {
        toast.success('Memory deleted')
        loadMemories()
        setSelectedMemory(null)
      }
    } catch (error) {
      toast.error('Failed to delete memory')
    } finally {
      setLoading(false)
    }
  }

  // Get memory history
  const handleViewHistory = async (memoryId: string) => {
    try {
      const response = await fetch('/api/memory/v5/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId })
      })

      const history = await response.json()
      console.log('Memory history:', history)
      // Show history in modal or panel
    } catch (error) {
      toast.error('Failed to load history')
    }
  }

  // Group memories by category
  const groupedMemories = () => {
    const groups: Record<string, Memory[]> = {}

    filteredMemories.forEach(memory => {
      const categories = memory.categories || ['uncategorized']
      categories.forEach(cat => {
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(memory)
      })
    })

    return groups
  }

  useEffect(() => {
    if (isOpen) {
      loadMemories()
    }
  }, [isOpen, activeTab, selectedCategories])

  useEffect(() => {
    const filtered = memories.filter(m => {
      if (searchQuery) {
        return m.memory.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
    setFilteredMemories(filtered)
  }, [searchQuery, memories])

  // For embedded mode, render without backdrop and motion
  if (embedded) {
    if (!isOpen) return null

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mem0 Cloud</h2>
                <p className="text-xs text-gray-500">AI Memory System</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['all', 'user', 'agent'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {tab === 'all' && <Layers className="w-3 h-3" />}
                  {tab === 'user' && <User className="w-3 h-3" />}
                  {tab === 'agent' && <Bot className="w-3 h-3" />}
                  <span className="capitalize">{tab}</span>
                  <span className="px-1 py-0.5 bg-white/50 rounded text-[10px]">
                    {memories.filter(m =>
                      tab === 'all' ? true :
                      tab === 'user' ? m.user_id === userId :
                      m.agent_id === agentId
                    ).length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rest of the content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search memories..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                onClick={() => loadMemories()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Memory List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && memories.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : Object.entries(groupedMemories()).map(([category, mems]) => (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => {
                    if (expandedCategories.includes(category)) {
                      setExpandedCategories(expandedCategories.filter(c => c !== category))
                    } else {
                      setExpandedCategories([...expandedCategories, category])
                    }
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.includes(category) ? (
                      <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-xs font-medium text-gray-700">{category}</span>
                    <span className="px-1 py-0.5 bg-gray-200 rounded text-[10px] text-gray-600">
                      {mems.length}
                    </span>
                  </div>
                  <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${
                    expandedCategories.includes(category) ? 'rotate-90' : ''
                  }`} />
                </button>

                <AnimatePresence>
                  {expandedCategories.includes(category) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pl-4"
                    >
                      {mems.map(memory => (
                        <div
                          key={memory.id}
                          onClick={() => setSelectedMemory(memory)}
                          className={`p-2 bg-gray-50 border rounded-lg cursor-pointer transition-all hover:border-gray-400 ${
                            selectedMemory?.id === memory.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {memory.memory}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[10px] text-gray-500">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {filteredMemories.length === 0 && !loading && (
              <div className="text-center py-8">
                <Database className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No memories found</p>
              </div>
            )}
          </div>

          {/* Add Memory Section */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Add Memory</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setNewMemory({ ...newMemory, type: 'user' })}
                  className={`p-1 rounded text-xs transition-colors ${
                    newMemory.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setNewMemory({ ...newMemory, type: 'agent' })}
                  className={`p-1 rounded text-xs transition-colors ${
                    newMemory.type === 'agent'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              value={newMemory.content}
              onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
              placeholder="Type memory..."
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 resize-none placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              rows={2}
            />

            <button
              onClick={handleAddMemory}
              disabled={!newMemory.content || loading}
              className="w-full mt-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              Add Memory
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Original modal version
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed left-0 top-0 h-full w-[480px] bg-white border-r border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Mem0 Cloud Memory</h2>
                    <p className="text-xs text-gray-500">AI Memory Management System</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'user', 'agent'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {tab === 'all' && <Layers className="w-4 h-4" />}
                      {tab === 'user' && <User className="w-4 h-4" />}
                      {tab === 'agent' && <Bot className="w-4 h-4" />}
                      <span className="capitalize">{tab}</span>
                      <span className="px-1.5 py-0.5 bg-white/50 rounded text-xs">
                        {memories.filter(m =>
                          tab === 'all' ? true :
                          tab === 'user' ? m.user_id === userId :
                          m.agent_id === agentId
                        ).length}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search memories..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  onClick={() => loadMemories()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {/* Memory List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && memories.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : Object.entries(groupedMemories()).map(([category, mems]) => (
                  <div key={category} className="space-y-2">
                    <button
                      onClick={() => {
                        if (expandedCategories.includes(category)) {
                          setExpandedCategories(expandedCategories.filter(c => c !== category))
                        } else {
                          setExpandedCategories([...expandedCategories, category])
                        }
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedCategories.includes(category) ? (
                          <FolderOpen className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Folder className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs text-gray-600">
                          {mems.length}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedCategories.includes(category) ? 'rotate-90' : ''
                      }`} />
                    </button>

                    <AnimatePresence>
                      {expandedCategories.includes(category) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1 pl-6"
                        >
                          {mems.map(memory => (
                            <motion.div
                              key={memory.id}
                              onClick={() => setSelectedMemory(memory)}
                              className={`p-3 bg-gray-50 border rounded-lg cursor-pointer transition-all hover:border-gray-400 ${
                                selectedMemory?.id === memory.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-700 line-clamp-2 flex-1">
                                  {memory.memory}
                                </p>
                                <div className="flex items-center gap-1">
                                  {memory.user_id && (
                                    <User className="w-3 h-3 text-blue-400" />
                                  )}
                                  {memory.agent_id && (
                                    <Bot className="w-3 h-3 text-green-400" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {new Date(memory.created_at).toLocaleDateString()}
                                </span>
                                {memory.confidence && (
                                  <span className="ml-auto px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                    {Math.round(memory.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {filteredMemories.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No memories found</p>
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              {selectedMemory && (
                <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Memory Details</h3>
                      <button
                        onClick={() => setSelectedMemory(null)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {editingMemory?.id === selectedMemory.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingMemory.memory}
                          onChange={(e) => setEditingMemory({
                            ...editingMemory,
                            memory: e.target.value
                          })}
                          className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                          rows={6}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateMemory}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMemory(null)}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{selectedMemory.memory}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Hash className="w-3 h-3" />
                            <span>{selectedMemory.id.slice(0, 12)}...</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedMemory.id)
                                toast.success('ID copied')
                              }}
                              className="ml-auto p-1 hover:bg-gray-100 rounded"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          {selectedMemory.categories && (
                            <div className="flex flex-wrap gap-1">
                              {selectedMemory.categories.map(cat => (
                                <span
                                  key={cat}
                                  className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 space-y-1 text-xs text-gray-500">
                            <p>Created: {new Date(selectedMemory.created_at).toLocaleString()}</p>
                            {selectedMemory.updated_at !== selectedMemory.created_at && (
                              <p>Updated: {new Date(selectedMemory.updated_at).toLocaleString()}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setEditingMemory(selectedMemory)}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleViewHistory(selectedMemory.id)}
                            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(selectedMemory.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Add Memory Section */}
            <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Add New Memory</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewMemory({ ...newMemory, type: 'user' })}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      newMemory.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setNewMemory({ ...newMemory, type: 'agent' })}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      newMemory.type === 'agent'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                placeholder="Type a memory to add..."
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 text-sm resize-none placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                rows={2}
              />

              <button
                onClick={handleAddMemory}
                disabled={!newMemory.content || loading}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Memory
              </button>
            </div>

            {/* Stats Bar */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {memories.length} memories
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {Object.keys(groupedMemories()).length} categories
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Connected</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}