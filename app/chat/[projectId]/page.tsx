import ChatProfessional from './ChatProfessional'

export default function ChatInterface({ params }: { params: Promise<{ projectId: string }> }) {
  return <ChatProfessional params={params} />
}