import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return <ProjectsClient userId={user.id} />
}
