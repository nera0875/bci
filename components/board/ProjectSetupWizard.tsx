'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { RAGService } from '@/lib/services/ragService'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  onComplete: () => void
  onError: (error: string) => void
}

export function ProjectSetupWizard({ projectId, onComplete, onError }: Props) {
  const [target, setTarget] = useState('')
  const [objective, setObjective] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [step, setStep] = useState<'input' | 'analyzing' | 'result'>('input')

  const supabase = createClient()
  const rag = new RAGService()

  // Base rules pour pentest, adaptées au type de business
  const basePentestRules = (businessModel: string) => {
    const commonRules = [
      {
        type: 'rule',
        title: 'Price Manipulation (Prix Négatif)',
        content: 'Test manipulation de prix en utilisant des valeurs négatives ou décimales inattendues. Vérifier si le système accepte des prix < 0 ou des formats invalides.',
        metadata: { category: 'Business Logic', confidence: 0.9, patterns: ['negative-price', 'decimal-bypass'] }
      },
      {
        type: 'rule',
        title: 'IDOR (Insecure Direct Object Reference)',
        content: 'Tester l\'accès direct à des objets (utilisateurs, commandes) en modifiant les IDs dans les URLs ou paramètres. Vérifier si un utilisateur peut accéder aux données d\'un autre.',
        metadata: { category: 'Authorization', confidence: 0.85, patterns: ['idor-user', 'idor-order'] }
      },
      {
        type: 'rule',
        title: 'Quantity Bypass',
        content: 'Tester les limites de quantité dans les paniers ou commandes. Essayer de passer des quantités > max ou < 0 pour contourner les restrictions.',
        metadata: { category: 'Business Logic', confidence: 0.8, patterns: ['quantity-overflow', 'negative-qty'] }
      },
      {
        type: 'rule',
        title: 'Race Condition sur Paiement',
        content: 'Simuler des conditions de course pour soumettre plusieurs paiements simultanés ou modifier le statut de commande pendant le traitement.',
        metadata: { category: 'Concurrency', confidence: 0.75, patterns: ['race-payment', 'order-status-bypass'] }
      },
      {
        type: 'rule',
        title: 'Authentication Bypass',
        content: 'Tester les failles d\'authentification: session fixation, cookie manipulation, weak password policies, account enumeration.',
        metadata: { category: 'Authentication', confidence: 0.9, patterns: ['session-fixation', 'cookie-poisoning'] }
      }
    ]

    // Rules spécifiques au business model
    const modelSpecific = {
      'e-commerce': [
        {
          type: 'rule',
          title: 'Coupon Code Abuse',
          content: 'Tester l\'abuse de codes promo: réutilisation multiple, stacking, codes non expirés.',
          metadata: { category: 'Business Logic', confidence: 0.85, patterns: ['coupon-abuse', 'promo-stacking'] }
        },
        {
          type: 'rule',
          title: 'Shipping Cost Manipulation',
          content: 'Modifier les coûts d\'expédition ou adresses pour obtenir livraison gratuite ou à des destinations non autorisées.',
          metadata: { category: 'Business Logic', confidence: 0.8, patterns: ['shipping-bypass', 'address-spoofing'] }
        }
      ],
      'api': [
        {
          type: 'rule',
          title: 'API Rate Limit Bypass',
          content: 'Tester le contournement des limites de taux: IP rotation, parameter pollution, timing attacks.',
          metadata: { category: 'API Security', confidence: 0.8, patterns: ['rate-limit-bypass', 'ip-rotation'] }
        },
        {
          type: 'rule',
          title: 'Mass Assignment',
          content: 'Tester l\'injection de paramètres inattendus pour modifier des champs sensibles (admin, role).',
          metadata: { category: 'API Security', confidence: 0.85, patterns: ['mass-assignment', 'param-injection'] }
        }
      ],
      'banking': [
        {
          type: 'rule',
          title: 'Transaction Amount Manipulation',
          content: 'Modifier les montants de transactions ou détails pendant le processus de confirmation.',
          metadata: { category: 'Financial', confidence: 0.95, patterns: ['amount-tampering', 'tx-modification'] }
        },
        {
          type: 'rule',
          title: 'Account Takeover via Weak MFA',
          content: 'Tester les faiblesses MFA: SMS interception, weak recovery, social engineering vectors.',
          metadata: { category: 'Authentication', confidence: 0.9, patterns: ['mfa-bypass', 'recovery-weakness'] }
        }
      ]
      // Ajouter plus de modèles au besoin
    }

    return [...commonRules, ...(modelSpecific[businessModel.toLowerCase()] || [])]
  }

  const analyzeTarget = async () => {
    if (!target || !objective) {
      onError('Veuillez décrire la cible et l\'objectif')
      return
    }

    setAnalyzing(true)
    setStep('analyzing')

    try {
      // Générer un prompt pour Claude
      const prompt = `Analyse cette cible de pentest: ${target}

Objectif: ${objective}

1. Identifie le modèle business (ex: e-commerce, API bancaire, etc.)
2. Charge 15 patterns vulnérables pertinents pour ce type
3. Crée une structure optimale de board avec folders, documents, rules
4. Retourne en JSON: {
  "businessModel": "string",
  "vulnerablePatterns": ["pattern1", "pattern2", ...],
  "structure": {
    "nodes": [
      {
        "type": "folder|document|rule|prompt",
        "title": "string",
        "content": "string",
        "parent_id": "uuid|null",
        "position": number,
        "metadata": {}
      }
    ]
  }
}`

      // Appel à Claude via API
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          projectId,
          maxTokens: 2000,
          temperature: 0.3 
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse avec Claude')
      }

      const { content } = await response.json()

      // Recherche RAG pour patterns similaires
      const similarPatterns = await rag.searchSimilar(
        `pentest patterns for ${objective} in ${target}`, 
        10, 
        0.7, 
        projectId
      )

      // Parser la réponse Claude (simplifié, en production utiliser un parser JSON)
      let parsedAnalysis
      try {
        parsedAnalysis = JSON.parse(content)
      } catch {
        // Fallback: extraire manuellement
        parsedAnalysis = {
          businessModel: 'E-commerce', // Détecté par défaut
          vulnerablePatterns: similarPatterns.map((p: any) => p.content.title || p.type),
          structure: {
            nodes: [
              {
                type: 'folder',
                title: 'Reconnaissance',
                content: '',
                parent_id: null,
                position: 1,
                metadata: { icon: 'search' }
              },
              {
                type: 'document',
                title: `Business Model: ${parsedAnalysis?.businessModel || 'Unknown'}`,
                content: `Analyse automatique: Modèle ${parsedAnalysis?.businessModel}. Objectif: ${objective}`,
                parent_id: null,
                position: 2,
                metadata: { patterns: parsedAnalysis?.vulnerablePatterns || [] }
              }
              // Ajouter plus de nodes basés sur l'analyse
            ]
          }
        }
      }

      setAnalysisResult({
        businessModel: parsedAnalysis.businessModel,
        patterns: parsedAnalysis.vulnerablePatterns,
        similar: similarPatterns,
        structure: parsedAnalysis.structure
      })

      setStep('result')

      // Créer la structure automatiquement dans la base
      await createStructure(projectId, parsedAnalysis.structure)

      // Intégrer les base rules automatiquement
      await integrateBaseRules(projectId, parsedAnalysis.businessModel)

    } catch (error) {
      console.error('Erreur analyse:', error)
      onError('Erreur lors de l\'analyse: ' + (error as Error).message)
      setStep('input')
    } finally {
      setAnalyzing(false)
    }
  }

  const integrateBaseRules = async (projectId: string, businessModel: string) => {
    try {
      const rules = basePentestRules(businessModel)

      // Insérer les rules de base
      const { error } = await supabase
        .from('memory_nodes')
        .insert(rules.map(rule => ({
          project_id: projectId,
          type: 'rule',
          content: { title: rule.title, description: rule.content },
          metadata: rule.metadata,
          position: rules.indexOf(rule)
        })))

      if (error) throw error

      console.log(`${rules.length} rules de base intégrées pour ${businessModel}`)

      // Optionnel: générer embeddings pour ces rules
      for (const rule of rules) {
        await rag.storeWithEmbedding(
          { title: rule.title, description: rule.content }, 
          rule.metadata, 
          projectId
        )
      }

    } catch (error) {
      console.error('Erreur intégration base rules:', error)
      onError('Erreur lors de l\'intégration des rules de base')
    }
  }

  const createStructure = async (projectId: string, structure: any) => {
    try {
      // Appel API pour créer les nodes
      const response = await fetch('/api/memory/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          nodes: structure.nodes,
          action: 'create_structure'
        })
      })

      if (!response.ok) throw new Error('Erreur création structure')

      const { createdNodes } = await response.json()

      // Créer le board via API
      await fetch('/api/board/auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          structure: createdNodes,
          analysis: analysisResult
        })
      })

    } catch (error) {
      console.error('Erreur création structure:', error)
      onError('Erreur lors de la création de la structure')
    }
  }

  if (step === 'input') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🆕 Nouveau Projet Pentest</CardTitle>
          <CardDescription>
            Décris ta cible et ton objectif. L'IA analysera automatiquement et créera la structure optimale avec rules de base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">📝 Décris ta cible</label>
            <Input
              placeholder="Site e-commerce vulnerable-shop.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">🎯 Objectif</label>
            <Textarea
              placeholder="Trouver toutes les failles Business Logic"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={analyzeTarget} className="w-full" disabled={!target || !objective}>
            Analyser et Créer Structure Optimale
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'analyzing') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Analyse en cours...</CardTitle>
          <CardDescription>L'IA identifie le modèle business, charge les patterns et intègre les rules de base.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-sm text-gray-600">Génération de la structure optimale avec rules intégrées...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'result' && analysisResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Structure et Rules Créées!
          </CardTitle>
          <CardDescription>
            Modèle business: {analysisResult.businessModel}
            <br />
            Patterns chargés: {analysisResult.patterns.length}
            <br />
            Rules de base intégrées: {basePentestRules(analysisResult.businessModel).length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={onComplete} className="w-full">
              Accéder au Board
            </Button>
            <Button variant="outline" onClick={() => setStep('input')} className="w-full">
              Modifier et Réanalyser
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}