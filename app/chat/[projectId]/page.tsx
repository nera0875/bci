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

  // Verify user owns this project
  const { projectId } = await params
  const supabase = await createClient()

  const { data: project, error } = await (supabase as any)
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  // If project doesn't exist or user doesn't own it, redirect to projects
  if (error || !project) {
    redirect('/projects')
  }

  return <ChatProfessionalNew params={params} />
}
