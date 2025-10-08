'use client'

import { useState } from 'react'
import { Download, Upload, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DataTransferPanelProps {
  projectId: string
}

interface ImportStats {
  memoryFacts: { imported: number; skipped: number; errors: number }
  memoryNodes: { imported: number; skipped: number; errors: number }
  memoryCategories: { imported: number; skipped: number; errors: number }
  ruleCategories: { imported: number; skipped: number; errors: number }
  rules: { imported: number; skipped: number; errors: number }
  systemPrompts: { imported: number; skipped: number; errors: number }
}

export default function DataTransferPanel({ projectId }: DataTransferPanelProps) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMode, setImportMode] = useState<'skip' | 'replace'>('skip')
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const response = await fetch(`/api/export-data?projectId=${projectId}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const data = await response.json()

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bci-export-${projectId}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError(null)
    setImportStats(null)

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.data) {
        throw new Error('Invalid export file format')
      }

      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          data: importData.data,
          mode: importMode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const result = await response.json()
      setImportStats(result.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const getTotalImported = () => {
    if (!importStats) return 0
    return Object.values(importStats).reduce((sum, stat) => sum + stat.imported, 0)
  }

  const getTotalSkipped = () => {
    if (!importStats) return 0
    return Object.values(importStats).reduce((sum, stat) => sum + stat.skipped, 0)
  }

  const getTotalErrors = () => {
    if (!importStats) return 0
    return Object.values(importStats).reduce((sum, stat) => sum + stat.errors, 0)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[#202123] mb-4">
        Export / Import Données
      </h3>

      {/* Export Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-[#202123] mb-2">Exporter</h4>
        <p className="text-xs text-[#6E6E80] mb-3">
          Télécharge toutes les données (Memory, Rules, System Prompts) en JSON
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-[#202123] hover:bg-[#2d2d30] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exporter
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-[#202123] mb-2">Importer</h4>
        <p className="text-xs text-[#6E6E80] mb-3">
          Upload un fichier JSON exporté précédemment
        </p>

        {/* Import Mode */}
        <div className="mb-3">
          <label className="text-xs font-medium text-[#202123] mb-2 block">
            Mode de traitement
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setImportMode('skip')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                importMode === 'skip'
                  ? 'bg-[#202123] text-white'
                  : 'bg-gray-100 text-[#6E6E80] hover:bg-gray-200'
              }`}
            >
              Ignorer les doublons
            </button>
            <button
              onClick={() => setImportMode('replace')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                importMode === 'replace'
                  ? 'bg-[#202123] text-white'
                  : 'bg-gray-100 text-[#6E6E80] hover:bg-gray-200'
              }`}
            >
              Remplacer les doublons
            </button>
          </div>
          <p className="text-xs text-[#6E6E80] mt-1">
            {importMode === 'skip'
              ? 'Les données existantes ne seront pas modifiées'
              : 'Les données existantes seront écrasées par les nouvelles'}
          </p>
        </div>

        {/* Upload Button */}
        <label className="px-4 py-2 bg-[#F7F7F8] hover:bg-gray-200 text-[#202123] rounded-lg cursor-pointer inline-flex items-center gap-2 text-sm transition-colors">
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Choisir un fichier
            </>
          )}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Erreur</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Import Stats */}
      {importStats && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h5 className="text-sm font-semibold text-green-900">Import réussi</h5>
          </div>

          <div className="space-y-2">
            {/* Summary */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-800 font-medium">Total importé:</span>
              <span className="text-green-900 font-semibold">{getTotalImported()}</span>
            </div>
            {getTotalSkipped() > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-700 font-medium">Ignoré (doublons):</span>
                <span className="text-yellow-800 font-semibold">{getTotalSkipped()}</span>
              </div>
            )}
            {getTotalErrors() > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700 font-medium">Erreurs:</span>
                <span className="text-red-800 font-semibold">{getTotalErrors()}</span>
              </div>
            )}

            {/* Detailed Stats */}
            <div className="pt-2 mt-2 border-t border-green-200">
              <p className="text-xs text-green-700 font-medium mb-2">Détails:</p>
              <div className="space-y-1 text-xs text-green-800">
                {importStats.memoryFacts.imported > 0 && (
                  <div>• Memory Facts: {importStats.memoryFacts.imported}</div>
                )}
                {importStats.memoryNodes.imported > 0 && (
                  <div>• Memory Nodes: {importStats.memoryNodes.imported}</div>
                )}
                {importStats.memoryCategories.imported > 0 && (
                  <div>• Memory Categories: {importStats.memoryCategories.imported}</div>
                )}
                {importStats.ruleCategories.imported > 0 && (
                  <div>• Rule Categories: {importStats.ruleCategories.imported}</div>
                )}
                {importStats.rules.imported > 0 && (
                  <div>• Rules: {importStats.rules.imported}</div>
                )}
                {importStats.systemPrompts.imported > 0 && (
                  <div>• System Prompts: {importStats.systemPrompts.imported}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-blue-800">
            Les embeddings (vecteurs) ne sont pas exportés et seront régénérés automatiquement lors de l'utilisation.
          </p>
        </div>
      </div>
    </div>
  )
}
