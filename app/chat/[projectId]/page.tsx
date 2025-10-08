import { redirect } from 'next/navigation'
import { getUser, createClient } from '@/lib/supabase/server'
import ChatProfessionalNew from './ChatProfessionalNew'

export default async function ChatInterface({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is a member of this project
  const { projectId } = await params
  const supabase = await createClient()

  // Check if user is a member of this project
  const { data: membership, error: memberError } = await (supabase as any)
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  // If not a member, redirect to projects
  if (memberError || !membership) {
    redirect('/projects')
  }

  // Get project details
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, api_keys')
    .eq('id', projectId)
    .single()

  // If API keys not configured, redirect to settings (only owners can configure)
  if (!project?.api_keys?.anthropic && membership.role === 'owner') {
    redirect(`/settings?projectId=${projectId}&setup=true`)
  }

  return <ChatProfessionalNew params={params} />
}
