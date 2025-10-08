'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Mail, CheckCircle, XCircle, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Invitation {
  id: string
  project_id: string
  project_name: string
  role: 'editor' | 'viewer'
  invited_by: string
  inviter_email: string
  token: string
  expires_at: string
  created_at: string
}

export default function InvitationsPage() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_invitations')

      if (error) throw error

      setInvitations(data || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
      toast.error('Error loading invitations')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async (token: string, projectName: string) => {
    setProcessing(token)
    try {
      const { data, error } = await supabase.rpc('accept_project_invitation', {
        invitation_token: token
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        toast.success(`Joined project "${projectName}"`)
        await loadInvitations()
        setTimeout(() => {
          router.push(`/chat/${result.project_id}`)
        }, 1500)
      } else {
        toast.error(result.error || 'Failed to accept invitation')
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      toast.error(error.message || 'Error accepting invitation')
    } finally {
      setProcessing(null)
    }
  }

  const declineInvitation = async (id: string, projectName: string) => {
    if (!confirm(`Decline invitation to "${projectName}"?`)) return

    try {
      const { error } = await supabase
        .from('project_invitations')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Invitation declined')
      await loadInvitations()
    } catch (error) {
      console.error('Error declining invitation:', error)
      toast.error('Error declining invitation')
    }
  }

  const getRoleBadge = (role: string) => {
    const config = {
      editor: { label: 'Editor', color: 'bg-[#202123] text-white' },
      viewer: { label: 'Viewer', color: 'bg-[#F7F7F8] text-[#6E6E80]' }
    }
    const { label, color } = config[role as keyof typeof config]
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-[#F7F7F8] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#6E6E80]" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[#202123] flex items-center gap-3">
                <Mail className="w-7 h-7" />
                Project Invitations
              </h1>
              <p className="text-sm text-[#6E6E80] mt-1">
                {invitations.length === 0
                  ? 'No pending invitations'
                  : `${invitations.length} pending invitation${invitations.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-[#F7F7F8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#6E6E80]" />
            </div>
            <h2 className="text-xl font-semibold text-[#202123] mb-2">No invitations</h2>
            <p className="text-[#6E6E80]">
              You don't have any pending project invitations at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#202123] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {invitation.project_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Invited by {invitation.inviter_email}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(invitation.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-13">
                      {getRoleBadge(invitation.role)}
                      <span className="text-xs text-gray-500">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptInvitation(invitation.token, invitation.project_name)}
                      disabled={processing !== null}
                      className="px-4 py-2 bg-[#202123] hover:bg-[#2d2d30] disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {processing === invitation.token ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => declineInvitation(invitation.id, invitation.project_name)}
                      disabled={processing !== null}
                      className="px-4 py-2 bg-[#F7F7F8] hover:bg-gray-200 disabled:bg-gray-100 text-[#202123] font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
