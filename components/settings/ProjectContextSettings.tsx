'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Target, X, Plus, Briefcase, DollarSign, Users, GitBranch } from 'lucide-react'

interface ProjectContextSettingsProps {
  projectId: string
}

interface ProjectContext {
  business_type?: string
  business_model?: string
  value_points: string[]
  user_roles: string[]
  workflows: string[]
  economic_risks: string[]
  project_goal?: string
}

export function ProjectContextSettings({ projectId }: ProjectContextSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [context, setContext] = useState<ProjectContext>({
    value_points: [],
    user_roles: [],
    workflows: [],
    economic_risks: []
  })

  // Temp inputs for adding items
  const [newValuePoint, setNewValuePoint] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newWorkflow, setNewWorkflow] = useState('')
  const [newRisk, setNewRisk] = useState('')

  useEffect(() => {
    loadContext()
  }, [projectId])

  const loadContext = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('project_context')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      if (data) {
        setContext({
          business_type: data.business_type,
          business_model: data.business_model,
          value_points: data.value_points || [],
          user_roles: data.user_roles || [],
          workflows: data.workflows || [],
          economic_risks: data.economic_risks || [],
          project_goal: data.project_goal
        })
      }
    } catch (error) {
      console.error('Error loading context:', error)
      toast.error('Erreur chargement du contexte')
    } finally {
      setLoading(false)
    }
  }

  const saveContext = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('project_context')
        .upsert({
          project_id: projectId,
          business_type: context.business_type,
          business_model: context.business_model,
          value_points: context.value_points,
          user_roles: context.user_roles,
          workflows: context.workflows,
          economic_risks: context.economic_risks,
          project_goal: context.project_goal
        })

      if (error) throw error

      toast.success('✅ Contexte projet sauvegardé !')
    } catch (error) {
      console.error('Error saving context:', error)
      toast.error('Erreur sauvegarde du contexte')
    } finally {
      setSaving(false)
    }
  }

  const addItem = (type: 'value_points' | 'user_roles' | 'workflows' | 'economic_risks', value: string) => {
    if (!value.trim()) return
    setContext({
      ...context,
      [type]: [...context[type], value.trim()]
    })
  }

  const removeItem = (type: 'value_points' | 'user_roles' | 'workflows' | 'economic_risks', index: number) => {
    setContext({
      ...context,
      [type]: context[type].filter((_, i) => i !== index)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Target className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Contexte Business
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Informe l'IA sur ton business pour des suggestions BLV contextualisées
          </p>
        </div>
      </div>

      {/* Business Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Type d'application
        </Label>
        <Select
          value={context.business_type || ''}
          onValueChange={(value) => setContext({ ...context, business_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionne le type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="e-commerce">🛒 E-commerce</SelectItem>
            <SelectItem value="fintech">💰 Fintech</SelectItem>
            <SelectItem value="saas">☁️ SaaS</SelectItem>
            <SelectItem value="social">👥 Social Network</SelectItem>
            <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
            <SelectItem value="marketplace">🏪 Marketplace</SelectItem>
            <SelectItem value="other">🔧 Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Business Model */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Modèle économique
        </Label>
        <Select
          value={context.business_model || ''}
          onValueChange={(value) => setContext({ ...context, business_model: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionne le modèle..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="marketplace">🏪 Marketplace (commissions)</SelectItem>
            <SelectItem value="subscription">📅 Subscription (abonnements)</SelectItem>
            <SelectItem value="freemium">🎁 Freemium</SelectItem>
            <SelectItem value="transactional">💳 Transactionnel (ventes directes)</SelectItem>
            <SelectItem value="advertising">📺 Advertising (publicité)</SelectItem>
            <SelectItem value="other">🔧 Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Goal */}
      <div className="space-y-2">
        <Label>Objectif du projet</Label>
        <Textarea
          value={context.project_goal || ''}
          onChange={(e) => setContext({ ...context, project_goal: e.target.value })}
          placeholder="Ex: Tester les failles de logique métier sur le système de coupons et checkout pour identifier les risques de fraude..."
          rows={3}
        />
      </div>

      {/* Value Points */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Points de valeur (argent, crédits, ressources)
        </Label>
        <div className="flex gap-2">
          <Input
            value={newValuePoint}
            onChange={(e) => setNewValuePoint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem('value_points', newValuePoint)
                setNewValuePoint('')
              }
            }}
            placeholder="Ex: coupons, points fidélité, crédits..."
          />
          <Button
            type="button"
            onClick={() => {
              addItem('value_points', newValuePoint)
              setNewValuePoint('')
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {context.value_points.map((point, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {point}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-600"
                onClick={() => removeItem('value_points', i)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* User Roles */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Rôles utilisateurs
        </Label>
        <div className="flex gap-2">
          <Input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem('user_roles', newRole)
                setNewRole('')
              }
            }}
            placeholder="Ex: guest, user, premium, admin..."
          />
          <Button
            type="button"
            onClick={() => {
              addItem('user_roles', newRole)
              setNewRole('')
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {context.user_roles.map((role, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {role}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-600"
                onClick={() => removeItem('user_roles', i)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Workflows */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Workflows critiques
        </Label>
        <div className="flex gap-2">
          <Input
            value={newWorkflow}
            onChange={(e) => setNewWorkflow(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem('workflows', newWorkflow)
                setNewWorkflow('')
              }
            }}
            placeholder="Ex: checkout flow, coupon redemption, subscription upgrade..."
          />
          <Button
            type="button"
            onClick={() => {
              addItem('workflows', newWorkflow)
              setNewWorkflow('')
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {context.workflows.map((workflow, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {workflow}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-600"
                onClick={() => removeItem('workflows', i)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Economic Risks */}
      <div className="space-y-2">
        <Label>Risques économiques identifiés</Label>
        <div className="flex gap-2">
          <Input
            value={newRisk}
            onChange={(e) => setNewRisk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem('economic_risks', newRisk)
                setNewRisk('')
              }
            }}
            placeholder="Ex: revenue loss, fraud, resource abuse..."
          />
          <Button
            type="button"
            onClick={() => {
              addItem('economic_risks', newRisk)
              setNewRisk('')
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {context.economic_risks.map((risk, i) => (
            <Badge key={i} variant="destructive" className="gap-1">
              {risk}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-900"
                onClick={() => removeItem('economic_risks', i)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={saveContext}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? 'Sauvegarde...' : '✅ Sauvegarder le contexte'}
        </Button>
      </div>
    </div>
  )
}
