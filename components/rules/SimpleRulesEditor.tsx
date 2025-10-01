'use client'

import React, { useState, useEffect } from 'react'
import { Save, Plus, Eye, Lightbulb } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'react-hot-toast'

interface RulesSuggestion {
  pattern: string
  suggested_rule: string
  confidence: number
  id: string
}

interface SimpleRulesEditorProps {
  projectId: string
}

export function SimpleRulesEditor({ projectId }: SimpleRulesEditorProps) {
  const [rulesText, setRulesText] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<RulesSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Charger les règles existantes
  useEffect(() => {
    const loadRules = async () => {
      try {
        const response = await fetch(`/api/rules/natural?projectId=${projectId}`)
        if (response.ok) {
          const { rules_text } = await response.json()
          setRulesText(rules_text || '')
        }
      } catch (err) {
        console.error('Erreur chargement règles:', err)
      }
    }
    loadRules()
  }, [projectId])

  // Charger les suggestions d'amélioration
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetch(`/api/rules/suggestions?projectId=${projectId}`)
        if (response.ok) {
          const { suggestions: data } = await response.json()
          setSuggestions(data || [])
        }
      } catch (err) {
        console.error('Erreur chargement suggestions:', err)
      }
    }
    loadSuggestions()
  }, [projectId])

  // Sauvegarder les règles
  const saveRules = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/rules/natural', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          rules_text: rulesText
        })
      })

      if (response.ok) {
        toast.success('✅ Règles sauvegardées')
      } else {
        const error = await response.json()
        toast.error('❌ Erreur: ' + error.message)
      }
    } catch (err) {
      toast.error('❌ Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  // Ajouter une suggestion aux règles
  const applySuggestion = (suggestion: RulesSuggestion) => {
    const newRule = `\n\n# ${suggestion.pattern}\n${suggestion.suggested_rule}`
    setRulesText(prev => prev + newRule)
    toast.success('💡 Suggestion ajoutée')
  }

  // Templates pré-faits
  const templates = {
    'web-pentesting': `# Règles Web Pentesting

Range les requêtes HTTP dans Memory/Requêtes
Format: URL, Méthode, Headers, Body, Réponse

Mets les tests SQLi dans Memory/Auth/SQLi Tests  
Structure: Payload, URL, Résultat, Notes

Tests XSS vont dans Memory/Auth/XSS Tests
Inclus: Payload, Contexte, Résultat, Bypass

Business logic dans Memory/Business Logic
Format: Description, Impact, Exploit, Correction

Codes d'erreur intéressants dans Memory/Errors
Inclus: Code, Message, Contexte, Exploitation`,

    'api-testing': `# Règles API Testing

Range les endpoints dans Memory/API/Endpoints
Format: URL, Méthode, Paramètres, Réponse, Status

Tests d'autorisation dans Memory/API/Auth Tests
Structure: Endpoint, Token, Résultat, Bypass

Rate limiting dans Memory/API/Rate Limiting  
Inclus: Endpoint, Limite, Bypass, Impact

Fuites de données dans Memory/API/Data Leaks
Format: Endpoint, Données exposées, Sensibilité`,

    'bug-bounty': `# Règles Bug Bounty

Scope d'autorisation dans Memory/Scope
Format: Domaine, Autorisé, Restrictions, Notes

Vulnérabilités confirmées dans Memory/Confirmed
Structure: Type, Sévérité, Impact, Proof, Remediation

Tests en cours dans Memory/Testing
Inclus: Cible, Méthode, Status, Résultat partiel

False positives dans Memory/False Positives
Format: Test, Résultat initial, Vérification, Conclusion`
  }

  const loadTemplate = (templateKey: string) => {
    setRulesText(templates[templateKey as keyof typeof templates])
    setShowTemplates(false)
    toast.success('📋 Template chargé')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">📋 Règles Projet</h2>
          <p className="text-gray-600 text-sm">
            Écrivez vos règles en français. L'IA les comprendra et les appliquera automatiquement.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Templates
          </Button>
          
          {suggestions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowSuggestions(true)}
              className="flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Suggestions ({suggestions.length})
            </Button>
          )}
          
          <Button
            onClick={saveRules}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Éditeur principal */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Règles en langage naturel</h3>
            <span className="text-sm text-gray-500">
              {rulesText.length} caractères
            </span>
          </div>
        </div>
        
        <textarea
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          className="w-full h-96 p-4 border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder={`Exemples de règles simples :

Range les requêtes HTTP dans Memory/Requêtes
Format: URL, Méthode, Headers, Body, Réponse

Mets les tests SQLi dans Memory/Auth/SQLi Tests
Structure: Payload, URL, Résultat, Notes

Business logic va dans Memory/Business Logic
Inclus: Description, Impact, Exploit

L&apos;IA comprendra ces instructions et rangera automatiquement.`}
        />
      </div>

      {/* Aide et exemples */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Conseils pour de bonnes règles</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Utilisez un langage simple et direct</li>
          <li>• Spécifiez le format attendu (colonnes du tableau)</li>
          <li>• Une règle par ligne ou par paragraphe</li>
          <li>• L'IA comprend les variations de vocabulaire</li>
        </ul>
      </div>

      {/* Dialog Templates */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates de Règles</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(templates).map(([key, content]) => (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium capitalize">
                      {key.replace('-', ' ')}
                    </h4>
                    <Button 
                      size="sm"
                      onClick={() => loadTemplate(key)}
                    >
                      Utiliser
                    </Button>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {content.substring(0, 200)}...
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Suggestions */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>💡 Suggestions d'amélioration</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              L'IA a détecté ces patterns et suggère d'ajouter ces règles :
            </p>
            
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">Pattern détecté</div>
                    <div className="text-sm text-gray-600">{suggestion.pattern}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {Math.round(suggestion.confidence * 100)}% confiance
                    </span>
                    <Button 
                      size="sm"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                  {suggestion.suggested_rule}
                </div>
              </div>
            ))}
            
            {suggestions.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Aucune suggestion pour le moment. L'IA apprendra de vos interactions.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
