'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Check, Trash2 } from 'lucide-react'

interface TagTemplate {
  id: string
  project_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

interface TagPickerProps {
  projectId: string
  selectedTags: string[] // Array of tag names
  onTagsChange: (tags: string[]) => void
}

const COLORS = [
  { name: 'blue', label: 'Bleu', bg: 'bg-blue-100 dark:bg-blue-800/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
  { name: 'green', label: 'Vert', bg: 'bg-green-100 dark:bg-green-800/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
  { name: 'purple', label: 'Gris', bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-100 dark:bg-orange-800/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
  { name: 'pink', label: 'Gris clair', bg: 'bg-gray-200 dark:bg-gray-700/30', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  { name: 'yellow', label: 'Jaune', bg: 'bg-yellow-100 dark:bg-yellow-800/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
  { name: 'red', label: 'Rouge', bg: 'bg-red-100 dark:bg-red-800/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
  { name: 'gray', label: 'Gris', bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' }
]

export function TagPicker({ projectId, selectedTags, onTagsChange }: TagPickerProps) {
  const [templates, setTemplates] = useState<TagTemplate[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [projectId])

  const loadTemplates = async () => {
    try {
      const res = await fetch(`/api/tags/templates?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading tag templates:', error)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/tags/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: newTagName.trim(),
          color: newTagColor
        })
      })

      if (res.ok) {
        const newTemplate = await res.json()
        setTemplates([...templates, newTemplate])
        setNewTagName('')
        setNewTagColor('blue')
        setShowCreateForm(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create tag')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName))
    } else {
      onTagsChange([...selectedTags, tagName])
    }
  }

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all facts.`)) return

    try {
      const res = await fetch(`/api/tags/templates?id=${tagId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== tagId))
        // Remove from selected tags if present
        if (selectedTags.includes(tagName)) {
          onTagsChange(selectedTags.filter(t => t !== tagName))
        }
      } else {
        alert('Failed to delete tag')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert('Failed to delete tag')
    }
  }

  const getColorClasses = (colorName: string) => {
    return COLORS.find(c => c.name === colorName) || COLORS[0]
  }

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tagName => {
            const template = templates.find(t => t.name === tagName)
            const colorClasses = getColorClasses(template?.color || 'gray')
            return (
              <button
                key={tagName}
                onClick={() => toggleTag(tagName)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} hover:opacity-80 transition-opacity`}
              >
                {tagName}
                <X className="w-3 h-3" />
              </button>
            )
          })}
        </div>
      )}

      {/* Available Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedTags.length > 0 ? 'Add more tags' : 'Click to add tags'}
          </span>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showCreateForm ? 'Annuler' : '+ Nouveau tag'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nom du tag..."
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
            />

            <div className="flex flex-wrap gap-1.5">
              {COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => setNewTagColor(color.name)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border ${color.bg} ${color.text} ${color.border} ${
                    newTagColor === color.name ? 'ring-2 ring-blue-500' : ''
                  } hover:opacity-80 transition-opacity`}
                  title={color.label}
                >
                  {newTagColor === color.name && <Check className="w-3 h-3 inline mr-1" />}
                  {color.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || loading}
              className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        )}

        {/* Tag List */}
        <div className="flex flex-wrap gap-1.5">
          {templates.filter(t => !selectedTags.includes(t.name)).map(template => {
            const colorClasses = getColorClasses(template.color)
            return (
              <div key={template.id} className="inline-flex items-center gap-0.5">
                <button
                  onClick={() => toggleTag(template.name)}
                  className={`px-2.5 py-1 rounded-l-full text-xs font-medium border border-r-0 ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} hover:ring-2 hover:ring-blue-500 transition-all`}
                >
                  + {template.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTag(template.id, template.name)
                  }}
                  className={`px-1.5 py-1 rounded-r-full text-xs border ${colorClasses.bg} ${colorClasses.border} hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 hover:text-red-600 transition-all`}
                  title="Delete tag"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
