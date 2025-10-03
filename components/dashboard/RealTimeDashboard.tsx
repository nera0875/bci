'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Target, Bug, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import { PentestResult } from '@/lib/services/automatedPentester'

interface DashboardProps {
  projectId: string
}

interface ScanStats {
  totalTests: number
  completedTests: number
  vulnerabilitiesFound: number
  successRate: number
  recentFindings: PentestResult[]
  suggestions: string[]
  isScanning: boolean
}

export function RealTimeDashboard({ projectId }: DashboardProps) {
  const supabase = createClient()
  const [stats, setStats] = useState<ScanStats>({
    totalTests: 0,
    completedTests: 0,
    vulnerabilitiesFound: 0,
    successRate: 0,
    recentFindings: [],
    suggestions: [],
    isScanning: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    setupRealtimeSubscription()
  }, [projectId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Récupérer stats des tests
      const { data: testResults } = await supabase
        .from('memory_nodes')
        .select('content')
        .eq('project_id', projectId)
        .eq('type', 'test_result')
        .order('created_at', { ascending: false })
        .limit(20)

      if (testResults) {
        const allResults: PentestResult[] = testResults.flatMap(node => 
          node.content.results || []
        )

        const total = allResults.length
        const completed = allResults.filter(r => r.timestamp).length
        const vulns = allResults.filter(r => r.success).length
        const successRate = total > 0 ? Math.round((vulns / total) * 100) : 0
        const recent = allResults.slice(0, 5)

        setStats(prev => ({
          ...prev,
          totalTests: total,
          completedTests: completed,
          vulnerabilitiesFound: vulns,
          successRate,
          recentFindings: recent
        }))
      }

      // Récupérer suggestions d'optimisation
      const { data: suggestions } = await supabase
        .from('optimization_suggestions')
        .select('suggestion')
        .eq('project_id', projectId)
        .order('confidence', { ascending: false })
        .limit(3)

      setStats(prev => ({
        ...prev,
        suggestions: suggestions ? suggestions.map(s => s.suggestion) : []
      }))

      // Vérifier scan en cours
      const { data: activeScan } = await supabase
        .from('active_scans')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'running')
        .single()

      setStats(prev => ({ ...prev, isScanning: !!activeScan }))

    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    // Realtime pour test results
    const testSubscription = supabase
      .channel('test-results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memory_nodes', filter: `type=eq.test_result` },
        (payload) => {
          console.log('Realtime update:', payload)
          loadDashboardData()
        }
      )
      .subscribe()

    // Realtime pour scans active
    const scanSubscription = supabase
      .channel('active-scans')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_scans', filter: `project_id=eq.${projectId}` },
        (payload) => {
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(testSubscription)
      supabase.removeChannel(scanSubscription)
    }
  }

  const progress = stats.totalTests > 0 ? (stats.completedTests / stats.totalTests) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Scan Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progression: {Math.round(progress)}%</span>
              <span>{stats.completedTests}/{stats.totalTests} tests</span>
            </div>
            <Progress value={progress} className="w-full" />
            {stats.isScanning && (
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>Scan en cours... Mises à jour en temps réel.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vulnerabilities Found */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            Vulnérabilités Détectées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{stats.vulnerabilitiesFound}</span>
              <Badge variant="destructive" className="text-lg">
                {stats.successRate}% Taux de détection
              </Badge>
            </div>
            {stats.recentFindings.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Récentes:</h4>
                {stats.recentFindings.slice(0, 3).map((finding, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Badge variant={finding.success ? "destructive" : "secondary"}>
                      {finding.technique}
                    </Badge>
                    <span className="text-sm">{finding.target} - {finding.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IA Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Suggestions IA en Direct
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.suggestions.length > 0 ? (
              stats.suggestions.map((suggestion, index) => (
                <Alert key={index} className="p-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{suggestion}</AlertDescription>
                </Alert>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment. Lancez un scan pour voir les optimisations.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}