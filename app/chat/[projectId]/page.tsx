import ChatProfessionalNew from './ChatProfessionalNew'

export default function ChatInterface({ params }: { params: Promise<{ projectId: string }> }) {
  console.log('Page loaded successfully, rendering ChatInterface with params:', params);
  return <ChatProfessionalNew params={params} />
}
