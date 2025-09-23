'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, GripVertical, Folder, Shield, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'

type Rule = Database['public']['Tables']['rules']['Row'] & {
  folder?: string
}

interface RulesTableProps {
  projectId: string
}

interface SortableRuleProps {
  rule: Rule
  isEditing: boolean
  editForm: {
    name: string
    trigger: string
    action: string
    description: string
    folder?: string
  }
  onEdit: (rule: Rule) => void
  onSave: () => void
  onCancel: () => void
  onDelete: (id: string) => void
  onToggle: (rule: Rule) => void
  setEditForm: (form: any) => void
  availableFolders: string[]
}

function SortableRule({
  rule,
  isEditing,
  editForm,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggle,
  setEditForm,
  availableFolders
}: SortableRuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: rule.id})

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg border transition-all ${
        rule.enabled
          ? 'bg-white border-[#202123]/20 shadow-lg shadow-[#202123]/5'
          : 'bg-[#F7F7F8] border-[#6E6E80]/30 opacity-70'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-[#6E6E80]" />
      </div>

      <div className="pl-8 pr-4 py-4">
        {isEditing ? (
          // Edit Mode
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Rule name..."
                className="px-3 py-2 text-sm bg-white dark:bg-gray-50 border border-gray-300 dark:border-gray-400 text-gray-900 dark:text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={editForm.folder || '*'}
                onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-50 border border-gray-300 dark:border-gray-400 text-gray-900 dark:text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="*">Tous les dossiers</option>
                {availableFolders.map(folder => (
                  <option key={folder} value={folder}>📁 {folder}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={editForm.trigger}
              onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
              placeholder="Trigger (e.g., /feed, on_message, always)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={editForm.action}
              onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
              placeholder="Action (e.g., parse_http, analyze_vuln, store_memory)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-400 text-gray-700 dark:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!editForm.name || !editForm.trigger || !editForm.action}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          // Display Mode
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-[#202123]">{rule.name}</h4>
                  {rule.folder && rule.folder !== '*' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#F7F7F8] text-[#6E6E80] rounded">
                      <Folder className="w-3 h-3" />
                      {rule.folder}
                    </span>
                  )}
                </div>
                {rule.description && (
                  <p className="text-xs text-[#6E6E80] mt-1">{rule.description}</p>
                )}
              </div>
              <button
                onClick={() => onToggle(rule)}
                className={`p-2 rounded-lg transition-all ${
                  rule.enabled
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                    : 'bg-[#F7F7F8] hover:bg-[#6E6E80]/20 text-[#6E6E80]'
                }`}
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
              >
                {rule.enabled ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="space-y-1 text-xs mb-3">
              <div className="flex gap-2">
                <span className="text-[#6E6E80]">Trigger:</span>
                <span className="text-[#202123] font-mono bg-[#F7F7F8] px-2 py-0.5 rounded">
                  {rule.trigger}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#6E6E80]">Action:</span>
                <span className="text-[#202123] font-mono bg-[#F7F7F8] px-2 py-0.5 rounded">
                  {rule.action}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(rule)}
                className="px-3 py-1 text-xs text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-200 rounded transition-all"
              >
                <Edit2 className="w-3 h-3 inline mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="px-3 py-1 text-xs text-gray-600 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-100 rounded transition-all"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function RulesTable({ projectId }: RulesTableProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    trigger: '',
    action: '',
    description: '',
    folder: '*'
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [availableFolders, setAvailableFolders] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadRules()
    loadFolders()
    const cleanup = subscribeToRules()

    // Polling fallback pour garantir la synchronisation
    const interval = setInterval(() => {
      loadRules()
    }, 2000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [projectId, refreshKey])

  const loadFolders = async () => {
    const { data } = await supabase
      .from('memory_nodes')
      .select('name')
      .eq('project_id', projectId)
      .eq('type', 'folder')
      .order('name')

    if (data) {
      setAvailableFolders(data.map(f => f.name))
    }
  }

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })

    if (data && !error) {
      // Extract folder from config
      const rulesWithFolder = data.map(rule => ({
        ...rule,
        folder: (rule.config as any)?.folder || '*'
      }))
      setRules(rulesWithFolder)
    }
  }

  const subscribeToRules = () => {
    const channel = supabase
      .channel(`rules_${projectId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Rules change detected:', payload)
          loadRules()
          setRefreshKey(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const {active, over} = event

    if (active.id !== over?.id) {
      setRules((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over?.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Update priorities in database
        updatePriorities(newOrder)

        return newOrder
      })
    }
  }

  const updatePriorities = async (orderedRules: Rule[]) => {
    const updates = orderedRules.map((rule, index) => ({
      id: rule.id,
      priority: orderedRules.length - index
    }))

    for (const update of updates) {
      await supabase
        .from('rules')
        .update({ priority: update.priority })
        .eq('id', update.id)
    }
  }

  const toggleRule = async (rule: Rule) => {
    await supabase
      .from('rules')
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)

    // Force refresh immédiat
    setTimeout(() => loadRules(), 100)
  }

  const deleteRule = async (id: string) => {
    if (confirm('Delete this rule?')) {
      await supabase
        .from('rules')
        .delete()
        .eq('id', id)

      // Force refresh immédiat
      setTimeout(() => loadRules(), 100)
    }
  }

  const saveRule = async () => {
    if (editingId) {
      // Update existing
      await supabase
        .from('rules')
        .update({
          name: editForm.name,
          trigger: editForm.trigger,
          action: editForm.action,
          description: editForm.description,
          config: { folder: editForm.folder },
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)
    } else {
      // Create new
      await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: editForm.name,
          trigger: editForm.trigger,
          action: editForm.action,
          description: editForm.description,
          priority: rules.length,
          config: { folder: editForm.folder },
          enabled: true
        })
    }

    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })

    // Force refresh immédiat
    setTimeout(() => loadRules(), 100)
  }

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      description: rule.description || '',
      folder: (rule.config as any)?.folder || rule.folder || '*'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#202123]" />
            <h3 className="font-semibold text-[#202123]">Active Rules</h3>
          </div>
          <button
            onClick={() => {
              setIsCreating(true)
              setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
            }}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="Add new rule"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Create New Rule Form */}
        {isCreating && (
          <div className="p-4 bg-gray-50 dark:bg-white rounded-lg border border-gray-200 dark:border-gray-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Rule name..."
                className="px-3 py-2 text-sm bg-white dark:bg-gray-50 border border-gray-300 dark:border-gray-400 text-gray-900 dark:text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <select
                value={editForm.folder}
                onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-50 border border-gray-300 dark:border-gray-400 text-gray-900 dark:text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="*">Tous les dossiers</option>
                {availableFolders.map(folder => (
                  <option key={folder} value={folder}>📁 {folder}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={editForm.trigger}
              onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
              placeholder="Trigger (e.g., /feed, on_message, always)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={editForm.action}
              onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
              placeholder="Action (e.g., parse_http, analyze_vuln, store_memory)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#202123]/20 text-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-400 text-gray-700 dark:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={!editForm.name || !editForm.trigger || !editForm.action}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Existing Rules with Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rules.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {rules.map((rule) => (
              <SortableRule
                key={rule.id}
                rule={rule}
                isEditing={editingId === rule.id}
                editForm={editForm}
                onEdit={startEdit}
                onSave={saveRule}
                onCancel={cancelEdit}
                onDelete={deleteRule}
                onToggle={toggleRule}
                setEditForm={setEditForm}
                availableFolders={availableFolders}
              />
            ))}
          </SortableContext>
        </DndContext>

        {rules.length === 0 && !isCreating && (
          <div className="text-center text-gray-600 dark:text-gray-500 text-sm py-8">
            No rules defined yet.
            <br />
            Click + to create your first rule.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-300 text-xs text-gray-600 dark:text-gray-500">
        <div className="flex items-center justify-between">
          <span>{rules.filter(r => r.enabled).length}/{rules.length} rules active</span>
          <span className="text-gray-600">Drag to reorder</span>
        </div>
      </div>
    </div>
  )
}