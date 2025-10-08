'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    acceptInvitation()
  }, [token])

  const acceptInvitation = async () => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid invitation link')
      return
    }

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/accept-invitation?token=${token}`)
        return
      }

      // Accept invitation via RPC
      const { data, error } = await (supabase as any).rpc('accept_project_invitation', {
        invitation_token: token
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        setStatus('success')
        setMessage(`You have been added to the project as ${result.role}`)
        setProjectId(result.project_id)

        // Redirect to project after 2 seconds
        setTimeout(() => {
          router.push(`/chat/${result.project_id}`)
        }, 2000)
      } else {
        setStatus('error')
        setMessage(result.error || 'Failed to accept invitation')
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      setStatus('error')
      setMessage(error.message || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Accepting invitation...
                </h1>
                <p className="text-gray-600">
                  Please wait while we add you to the project
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Success!
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to project...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Error
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <button
                  onClick={() => router.push('/projects')}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                >
                  Go to Projects
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}
