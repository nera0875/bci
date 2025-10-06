'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Circle } from 'lucide-react'
import type { TestResult } from './TestMatrixView'
import TestDetailModal from './TestDetailModal'

interface TestCellProps {
  endpoint: string
  technique: string
  result?: TestResult
  projectId: string
  onUpdate: () => void
}

export default function TestCell({ endpoint, technique, result, projectId, onUpdate }: TestCellProps) {
  const [showModal, setShowModal] = useState(false)

  const getStatusIcon = () => {
    if (!result) {
      return <Circle className="w-5 h-5 text-gray-300" />
    }

    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'testing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'not_tested':
        return <Circle className="w-5 h-5 text-gray-300" />
      default:
        return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const getStatusColor = () => {
    if (!result) return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'

    switch (result.status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'testing':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'not_tested':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const getSeverityBadge = () => {
    if (!result?.result?.severity) return null

    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white'
    }

    return (
      <span className={`absolute top-0 right-0 px-1 text-[8px] font-bold rounded-bl ${colors[result.result.severity]}`}>
        {result.result.severity[0].toUpperCase()}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          relative
          w-full aspect-square
          flex items-center justify-center
          border rounded-lg
          transition-all
          hover:scale-105 hover:shadow-md
          ${getStatusColor()}
        `}
        title={`${technique} on ${endpoint}\nStatus: ${result?.status || 'not tested'}`}
      >
        {getStatusIcon()}
        {getSeverityBadge()}

        {/* Technique label */}
        <span className="absolute bottom-0 left-0 right-0 text-[8px] font-medium text-center text-gray-600 dark:text-gray-400 truncate px-0.5">
          {technique}
        </span>
      </button>

      {showModal && (
        <TestDetailModal
          endpoint={endpoint}
          technique={technique}
          result={result}
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onUpdate={() => {
            onUpdate()
            setShowModal(false)
          }}
        />
      )}
    </>
  )
}
