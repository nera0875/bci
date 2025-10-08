'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Users, Mail, Crown, Edit, Eye, Trash2, Copy, Check, X, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProjectMembersDialogProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: 'owner' | 'editor' | 'viewer'
}

interface Member {
  id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  email?: string
  invited_at: string
  accepted_at?: string
}

interface Invitation {
  id: string
  email: string
  role: 'editor' | 'viewer'
  token: string
  expires_at: string
  invited_by: string
  accepted_at?: string
}

export default function ProjectMembersDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  userRole
}: ProjectMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadMembersAndInvitations()
    }
  }, [open, projectId])

  const loadMembersAndInvitations = async () => {
    try {
      // Load members with user emails
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role, invited_at, accepted_at')
        .eq('project_id', projectId)

      if (membersError) throw membersError

      // Get user emails from auth.users (not profiles)
      const userIds = (membersData || []).map(m => m.user_id)
      const { data: usersData } = await supabase.rpc('get_user_emails', { user_ids: userIds })

      // Merge emails
      const membersWithEmails = (membersData || []).map((m: any) => ({
        ...m,
        email: usersData?.find((u: any) => u.id === m.user_id)?.email || 'Unknown'
      }))

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (invitationsError) throw invitationsError

      setMembers(membersWithEmails)
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Error loading members:', error)
      toast.error('Error loading members')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Valid email required')
      return
    }

    setInviting(true)
    try {
      const { data, error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: projectId,
          email: inviteEmail,
          role: inviteRole,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) throw error

      setInvitations([...invitations, data])
      setInviteEmail('')
      toast.success(`Invitation sent to ${inviteEmail}`)
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      if (error.code === '23505') {
        toast.error('Invitation already sent to this email')
      } else {
        toast.error('Error sending invitation')
      }
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this project?`)) return

    try {
      const member = members.find(m => m.id === memberId)
      if (!member) return

      const { error } = await supabase.rpc('remove_project_member', {
        p_project_id: projectId,
        p_user_id: member.user_id
      })

      if (error) throw error

      setMembers(members.filter(m => m.id !== memberId))
      toast.success('Member removed')
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || 'Error removing member')
    }
  }

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('project_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setInvitations(invitations.filter(i => i.id !== invitationId))
      toast.success('Invitation deleted')
    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast.error('Error deleting invitation')
    }
  }

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success('Invitation link copied')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5" />
      case 'editor': return <Edit className="w-3.5 h-3.5" />
      case 'viewer': return <Eye className="w-3.5 h-3.5" />
    }
  }

  const getRoleBadge = (role: string) => {
    const config = {
      owner: { label: 'Owner', color: 'bg-gray-900 text-white' },
      editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700' },
      viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600' }
    }
    const { label, color } = config[role as keyof typeof config]
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1', color)}>
        {getRoleIcon(role)}
        {label}
      </span>
    )
  }

  const canManageMembers = userRole === 'owner'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Users className="w-5 h-5" />
            Share "{projectName}"
          </DialogTitle>
        </DialogHeader>
        <p className="px-6 pt-4 text-sm text-gray-600">Invite collaborators to this project</p>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Invite Section */}
          {canManageMembers && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Invite by email
              </h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendInvitation()}
                  className="flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  onClick={sendInvitation}
                  disabled={inviting}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                </Button>
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Pending invitations</h3>
              <div className="space-y-2">
                {invitations.map(invitation => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {invitation.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      {getRoleBadge(invitation.role)}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => copyInvitationLink(invitation.token)}
                        className="p-2 hover:bg-amber-100 rounded transition-colors"
                        title="Copy invitation link"
                      >
                        {copiedToken === invitation.token ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      {canManageMembers && (
                        <button
                          onClick={() => deleteInvitation(invitation.id)}
                          className="p-2 hover:bg-red-100 rounded transition-colors"
                          title="Delete invitation"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Members ({members.length})</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {member.email || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.accepted_at ? 'Active' : 'Pending'}
                        </div>
                      </div>
                      {getRoleBadge(member.role)}
                    </div>
                    {canManageMembers && member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id, member.email || 'this user')}
                        className="p-2 hover:bg-red-50 rounded transition-colors ml-2"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
