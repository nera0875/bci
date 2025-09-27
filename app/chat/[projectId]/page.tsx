import ChatProfessionalNew from './ChatProfessionalNew'

export default function ChatInterface({ params }: { params: Promise<{ projectId: string }> }) {
  return <ChatProfessionalNew params={params} />
}
