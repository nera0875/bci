export async function createEmbedding(text: string): Promise<number[]> {
  try {
    // When running on server, we need absolute URL
    // Always use localhost for server-side calls, NOT external IP
    const baseUrl = typeof window === 'undefined'
      ? 'http://localhost:3001'
      : window.location.origin

    // Call our API route to generate embeddings
    const response = await fetch(`${baseUrl}/api/openai/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error('Failed to generate embedding')
    }

    const data = await response.json()
    return data.embedding
  } catch (error) {
    console.error('Error creating embedding:', error)
    // Return empty array as fallback
    return []
  }
}