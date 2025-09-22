'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type Rule = Database['public']['Tables']['rules']['Row']

interface RulesTableProps {
  projectId: string
}

export default function RulesTable({ projectId }: RulesTableProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    trigger: '',
    action: '',
    description: ''
  })

  useEffect(() => {
    loadRules()
    subscribeToRules()
  }, [projectId])

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })

    if (data && !error) {
      setRules(data)
    }
  }

  const subscribeToRules = () => {
    const channel = supabase
      .channel(`rules_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          loadRules()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const toggleRule = async (rule: Rule) => {
    await supabase
      .from('rules')
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)
  }

  const deleteRule = async (id: string) => {
    if (confirm('Delete this rule?')) {
      await supabase
        .from('rules')
        .delete()
        .eq('id', id)
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
          description: editForm.description
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
          priority: rules.length
        })
    }

    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '' })
  }

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      description: rule.description || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Rules Engine</h3>
          <button
            onClick={() => {
              setIsCreating(true)
              setEditForm({ name: '', trigger: '', action: '', description: '' })
            }}
            className="p-1.5 hover:bg-background rounded-lg transition-colors"
            title="Add new rule"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Create New Rule Form */}
        {isCreating && (
          <div className="p-4 bg-background rounded-lg border border-border space-y-3">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Rule name..."
              className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
              autoFocus
            />
            <input
              type="text"
              value={editForm.trigger}
              onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
              placeholder="Trigger (e.g., /feed, on_message, always)"
              className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <input
              type="text"
              value={editForm.action}
              onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
              placeholder="Action (e.g., parse_http, analyze_vuln, store_memory)"
              className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={!editForm.name || !editForm.trigger || !editForm.action}
                className="px-3 py-1.5 text-sm bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Existing Rules */}
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 rounded-lg border transition-all ${
              rule.enabled
                ? 'bg-background border-border'
                : 'bg-muted/50 border-border opacity-60'
            }`}
          >
            {editingId === rule.id ? (
              // Edit Mode
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <input
                  type="text"
                  value={editForm.trigger}
                  onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <input
                  type="text"
                  value={editForm.action}
                  onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted border border-input rounded focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={saveRule}
                    className="p-1.5 text-success hover:bg-muted rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{rule.name}</h4>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleRule(rule)}
                    className="p-1"
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="w-5 h-5 text-success" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Trigger:</span>
                    <span className="text-foreground font-mono">{rule.trigger}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="text-foreground font-mono">{rule.action}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEdit(rule)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-muted-foreground hover:text-error hover:bg-muted rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {rules.length === 0 && !isCreating && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No rules defined yet.
            <br />
            Click + to create your first rule.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        {rules.filter(r => r.enabled).length}/{rules.length} rules active
      </div>
    </div>
  )
}