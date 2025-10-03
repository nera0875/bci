'use client'

import { useState } from 'react'
import { X, Plus, Code, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface PlaybookAction {
  type: 'http' | 'validate' | 'extract' | 'store'
  payload: string
  description?: string
}

interface Playbook {
  name: string
  trigger: string
  actions: PlaybookAction[]
  enabled: boolean
}

interface PlaybookBuilderProps {
  initialPlaybook?: Playbook
  onSave: (playbook: Playbook) => void
  onCancel: () => void
}

export function PlaybookBuilder({ initialPlaybook, onSave, onCancel }: PlaybookBuilderProps) {
  const [name, setName] = useState(initialPlaybook?.name || '')
  const [trigger, setTrigger] = useState(initialPlaybook?.trigger || '')
  const [actions, setActions] = useState<PlaybookAction[]>(
    initialPlaybook?.actions || []
  )
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual')

  // État JSON pour mode édition
  const [jsonContent, setJsonContent] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Sync JSON quand on switch vers mode JSON
  const switchToJson = () => {
    const playbook = { name, trigger, actions, enabled: true }
    setJsonContent(JSON.stringify(playbook, null, 2))
    setJsonError('')
    setViewMode('json')
  }

  // Parser JSON et retour au mode visuel
  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonContent)
      setName(parsed.name || '')
      setTrigger(parsed.trigger || '')
      setActions(parsed.actions || [])
      setJsonError('')
      setViewMode('visual')
      toast.success('JSON validé et converti')
    } catch (e: any) {
      setJsonError(e.message)
      toast.error('JSON invalide : ' + e.message)
    }
  }

  const addAction = () => {
    setActions([...actions, { type: 'http', payload: '', description: '' }])
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, field: keyof PlaybookAction, value: any) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], [field]: value }
    setActions(newActions)
  }

  const handleSave = () => {
    if (!name || !trigger || actions.length === 0) {
      toast.error('Nom, déclencheur et au moins 1 action requis')
      return
    }

    onSave({ name, trigger, actions, enabled: true })
  }

  return (
    <div className="border rounded-lg bg-white shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">
          {initialPlaybook ? 'Éditer Playbook' : 'Créer Playbook'}
        </h2>

        <div className="flex items-center gap-2">
          {/* Toggle Visual/JSON */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => viewMode === 'json' ? switchToVisual() : setViewMode('visual')}
              className={`px-3 py-1 rounded flex items-center gap-2 text-sm ${
                viewMode === 'visual' ? 'bg-white shadow' : ''
              }`}
            >
              <Eye className="w-4 h-4" />
              Visuel
            </button>
            <button
              onClick={switchToJson}
              className={`px-3 py-1 rounded flex items-center gap-2 text-sm ${
                viewMode === 'json' ? 'bg-white shadow' : ''
              }`}
            >
              <Code className="w-4 h-4" />
              JSON
            </button>
          </div>

          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {viewMode === 'visual' ? (
          <div className="space-y-6">
            {/* Nom du Playbook */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom du Playbook
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Test IDOR sur API Users"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Déclencheur */}
            <div>
              <label className="block text-sm font-medium mb-2">
                🎯 Déclencheur (Quand exécuter ?)
              </label>

              <div className="space-y-3">
                {/* Endpoint Pattern */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="trigger-type"
                    checked={trigger.includes('endpoint')}
                    onChange={() => setTrigger('endpoint matches ""')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Quand endpoint correspond à</div>
                    {trigger.includes('endpoint') && (
                      <input
                        type="text"
                        value={trigger.match(/"(.+)"/)?.[1] || ''}
                        onChange={(e) => setTrigger(`endpoint matches "${e.target.value}"`)}
                        placeholder="/api/users/*"
                        className="w-full px-3 py-2 border rounded mt-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Ex: /api/users/* ou /checkout
                    </div>
                  </div>
                </label>

                {/* Manuel */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="trigger-type"
                    checked={trigger === 'manual'}
                    onChange={() => setTrigger('manual')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Déclenchement manuel uniquement</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tu décides quand lancer ce playbook
                    </div>
                  </div>
                </label>

                {/* Contexte */}
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="trigger-type"
                    checked={trigger.includes('context')}
                    onChange={() => setTrigger('context contains ""')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Quand contexte contient</div>
                    {trigger.includes('context') && (
                      <input
                        type="text"
                        value={trigger.match(/"(.+)"/)?.[1] || ''}
                        onChange={(e) => setTrigger(`context contains "${e.target.value}"`)}
                        placeholder="IDOR, authentication, etc."
                        className="w-full px-3 py-2 border rounded mt-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">
                  🔧 Actions (Étapes du test)
                </label>
                <button
                  onClick={addAction}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter Étape
                </button>
              </div>

              {actions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-gray-500">
                  Aucune action. Cliquez sur "Ajouter Étape" pour commencer.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Étape {idx + 1}</span>
                        <button
                          onClick={() => removeAction(idx)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>

                      {/* Type d'action */}
                      <div className="mb-3">
                        <label className="text-sm text-gray-600 mb-1 block">Type</label>
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(idx, 'type', e.target.value)}
                          className="w-full px-3 py-2 border rounded"
                        >
                          <option value="http">Requête HTTP</option>
                          <option value="validate">Validation</option>
                          <option value="extract">Extraction données</option>
                          <option value="store">Sauvegarder en mémoire</option>
                        </select>
                      </div>

                      {/* Payload selon type */}
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">
                          {action.type === 'http' && 'Requête HTTP'}
                          {action.type === 'validate' && 'Condition de succès'}
                          {action.type === 'extract' && 'Variable à extraire'}
                          {action.type === 'store' && 'Nom du document'}
                        </label>

                        {action.type === 'http' ? (
                          <textarea
                            value={action.payload}
                            onChange={(e) => updateAction(idx, 'payload', e.target.value)}
                            placeholder="GET /api/users/{id}&#10;Host: target.com&#10;Authorization: Bearer {token}"
                            className="w-full px-3 py-2 border rounded font-mono text-sm"
                            rows={4}
                          />
                        ) : (
                          <input
                            type="text"
                            value={action.payload}
                            onChange={(e) => updateAction(idx, 'payload', e.target.value)}
                            placeholder={
                              action.type === 'validate' ? 'status:200 ou contains:userId' :
                              action.type === 'extract' ? 'userId' :
                              'result_idor.md'
                            }
                            className="w-full px-3 py-2 border rounded"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Mode JSON
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Éditez directement le JSON du playbook. Cliquez sur "Visuel" pour revenir au mode visuel.
            </div>

            <textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              className="w-full h-96 px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm rounded border-2 border-gray-700 focus:outline-none focus:border-green-500"
              spellCheck={false}
            />

            {jsonError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <strong>Erreur JSON :</strong> {jsonError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-4 border-t bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !trigger || actions.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💾 Sauvegarder Playbook
        </button>
      </div>
    </div>
  )
}
