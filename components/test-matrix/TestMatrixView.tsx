'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Search, Plus, Download, Edit2, Trash2, FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import TestCell from './TestCell'
import PriorityQueuePanel from './PriorityQueuePanel'
import AddEndpointModal from './AddEndpointModal'
import EditEndpointModal from './EditEndpointModal'
import ImportEndpointsModal from './ImportEndpointsModal'

interface TestMatrixViewProps {
  projectId: string
}

export interface TestResult {
  id: string
  endpoint: string
  technique: string
  status: 'not_tested' | 'testing' | 'success' | 'failed'
  result: {
    payload?: string
    response?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    notes?: string
    http_method?: string
    http_status?: number
    vulnerability_confirmed?: boolean
  }
  tested_at?: string
  created_at: string
}

interface MatrixStats {
  total_tests: number
  tested: number
  success: number
  failed: number
  testing: number
  not_tested: number
  coverage_percent: number
}

const TECHNIQUES = ['SQLi', 'XSS', 'IDOR', 'CSRF', 'Auth', 'BizLogic', 'SSRF', 'RCE', 'LFI', 'XXE', 'Priv.Esc', 'FileUpload']

export default function TestMatrixView({ projectId }: TestMatrixViewProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [endpoints, setEndpoints] = useState<string[]>([])
  const [stats, setStats] = useState<MatrixStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null)
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([])
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    loadTestMatrix()
    loadStats()
  }, [projectId])

  const loadTestMatrix = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('project_id', projectId)
        .order('endpoint', { ascending: true })

      if (error) throw error

      setTestResults(data || [])

      // Extract unique endpoints
      const uniqueEndpoints = [...new Set(data?.map(t => t.endpoint) || [])]
      setEndpoints(uniqueEndpoints)

    } catch (error: any) {
      console.error('Error loading test matrix:', error)
      toast.error('Failed to load test matrix')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_test_matrix_stats', { filter_project_id: projectId })

      if (error) throw error

      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (error: any) {
      console.error('Error loading stats:', error)
    }
  }

  const getTestResult = (endpoint: string, technique: string): TestResult | undefined => {
    return testResults.find(t => t.endpoint === endpoint && t.technique === technique)
  }

  const handleRefresh = () => {
    loadTestMatrix()
    loadStats()
    toast.success('Refreshed')
  }

  const filteredEndpoints = searchQuery
    ? endpoints.filter(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
    : endpoints

  const toggleEndpointSelection = (endpoint: string) => {
    setSelectedEndpoints(prev =>
      prev.includes(endpoint)
        ? prev.filter(e => e !== endpoint)
        : [...prev, endpoint]
    )
  }

  const toggleSelectAll = () => {
    if (selectedEndpoints.length === filteredEndpoints.length) {
      setSelectedEndpoints([])
    } else {
      setSelectedEndpoints(filteredEndpoints)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEndpoints.length === 0) return

    if (!confirm(`Delete ${selectedEndpoints.length} endpoint(s) and all their test results?`)) return

    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('project_id', projectId)
        .in('endpoint', selectedEndpoints)

      if (error) throw error

      toast.success(`${selectedEndpoints.length} endpoint(s) deleted`)
      setSelectedEndpoints([])
      loadTestMatrix()
      loadStats()
    } catch (error: any) {
      console.error('Error deleting endpoints:', error)
      toast.error('Failed to delete endpoints')
    }
  }

  const handleExport = () => {
    const dataToExport = selectedEndpoints.length > 0
      ? testResults.filter(r => selectedEndpoints.includes(r.endpoint))
      : testResults

    const json = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${dataToExport.length} test results`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading test matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Main matrix area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header with stats */}
        <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Test Coverage Matrix
              </h1>
              {stats && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.tested}/{stats.total_tests} tests completed ({stats.coverage_percent}% coverage)
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export {selectedEndpoints.length > 0 ? `(${selectedEndpoints.length})` : 'All'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                <FileDown className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Endpoint
              </Button>
            </div>
          </div>

          {/* Stats badges */}
          {stats && (
            <div className="flex gap-3 mb-4">
              <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
                <span className="text-xs font-medium text-green-800 dark:text-green-200">
                  ✅ {stats.success} Success
                </span>
              </div>
              <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900 rounded-lg">
                <span className="text-xs font-medium text-red-800 dark:text-red-200">
                  ❌ {stats.failed} Failed
                </span>
              </div>
              <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  ⏳ {stats.testing} Testing
                </span>
              </div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  ○ {stats.not_tested} Not Tested
                </span>
              </div>
            </div>
          )}

          {/* Search & Bulk Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk Actions */}
            {selectedEndpoints.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedEndpoints.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Matrix grid */}
        <div className="flex-1 overflow-auto p-6">
          {/* Select All */}
          {filteredEndpoints.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
              <Checkbox
                checked={selectedEndpoints.length === filteredEndpoints.length && filteredEndpoints.length > 0}
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Select All ({filteredEndpoints.length})
              </label>
            </div>
          )}

          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No endpoints found. Add endpoints to start testing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEndpoints.map((endpoint) => {
                const testsForEndpoint = TECHNIQUES.map(tech => getTestResult(endpoint, tech))
                const completedTests = testsForEndpoint.filter(t => t && t.status !== 'not_tested').length
                const successCount = testsForEndpoint.filter(t => t?.status === 'success').length

                const isSelected = selectedEndpoints.includes(endpoint)

                return (
                  <div
                    key={endpoint}
                    className={`
                      bg-white dark:bg-gray-900 rounded-lg border-2 p-4 transition-all
                      ${isSelected
                        ? 'border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-500/20'
                        : 'border-gray-200 dark:border-gray-800'
                      }
                    `}
                  >
                    {/* Endpoint header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEndpointSelection(endpoint)}
                          id={`checkbox-${endpoint}`}
                        />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {endpoint}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {completedTests}/{TECHNIQUES.length} tests • {successCount} success
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {completedTests === 0 && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded">
                            🔴 HIGH PRIORITY
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEndpoint(endpoint)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Technique cells grid */}
                    <div className="grid grid-cols-12 gap-2">
                      {TECHNIQUES.map((technique) => {
                        const result = getTestResult(endpoint, technique)
                        return (
                          <TestCell
                            key={`${endpoint}-${technique}`}
                            endpoint={endpoint}
                            technique={technique}
                            result={result}
                            projectId={projectId}
                            onUpdate={loadTestMatrix}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Priority Queue sidebar */}
      <PriorityQueuePanel
        projectId={projectId}
        testResults={testResults}
        onTestComplete={loadTestMatrix}
      />

      {/* Modals */}
      {showAddModal && (
        <AddEndpointModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadTestMatrix()
            loadStats()
          }}
          existingEndpoints={endpoints}
        />
      )}

      {editingEndpoint && (
        <EditEndpointModal
          projectId={projectId}
          endpoint={editingEndpoint}
          onClose={() => setEditingEndpoint(null)}
          onSuccess={() => {
            loadTestMatrix()
            loadStats()
          }}
          existingEndpoints={endpoints}
        />
      )}

      {showImportModal && (
        <ImportEndpointsModal
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadTestMatrix()
            loadStats()
            setShowImportModal(false)
          }}
          existingEndpoints={endpoints}
        />
      )}
    </div>
  )
}
