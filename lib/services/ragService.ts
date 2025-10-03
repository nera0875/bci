import { createClient } from '@/lib/supabase/client';
import { createEmbedding } from './embeddings';

interface SearchResult {
  id: string;
  type: string;
  content: any;
  metadata: any;
  similarity: number;
}

export class RAGService {
  private supabase = createClient();

  async searchSimilar(query: string, topK: number = 5, similarityThreshold: number = 0.8, projectId?: string): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const embedding = await createEmbedding(query);

      if (embedding.length === 0) {
        console.warn('No embedding generated');
        return [];
      }

      // Search similar content using pgvector RPC
      let rpcParams = {
        query_embedding: embedding,
        similarity_threshold: similarityThreshold,
        max_results: topK
      };

      // If projectId is provided, filter by project
      if (projectId) {
        rpcParams = { ...rpcParams, project_id: projectId };
      }

      const { data, error } = await this.supabase.rpc('similarity_search', rpcParams);

      if (error) {
        console.error('RAG search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in RAG search:', error);
      return [];
    }
  }

  async storeWithEmbedding(content: any, metadata: any = {}, projectId?: string): Promise<void> {
    try {
      const embedding = await createEmbedding(JSON.stringify(content));

      const { error } = await this.supabase
        .from('memory_nodes')
        .insert({
          content,
          embedding,
          metadata,
          project_id: projectId,
          type: metadata.type || 'document'
        });

      if (error) {
        console.error('Error storing with embedding:', error);
      }
    } catch (error) {
      console.error('Error in storeWithEmbedding:', error);
    }
  }

  // Fonction pour indexer automatiquement les patterns de pentest
  async indexPatterns(projectId: string, patternsDir = 'public/templates'): Promise<void> {
    try {
      // Logique pour lire les fichiers JSON des patterns (à implémenter avec fs ou API)
      // Pour l'instant, exemple statique - en production, utiliser fs.readFileSync ou API
      const patterns = [
        { path: 'business_logic/price_manipulation.json', content: { /* contenu du pattern */ } },
        { path: 'business_logic/quantity_bypass.json', content: { /* contenu */ } },
        { path: 'business_logic/workflow_escalation.json', content: { /* contenu */ } }
        // Ajouter plus de patterns dynamiquement
      ];

      for (const pattern of patterns) {
        await this.storeWithEmbedding(
          pattern.content,
          {
            type: 'pentest_pattern',
            category: pattern.path.split('/')[0],
            path: pattern.path
          },
          projectId
        );
      }

      console.log(`Indexation de ${patterns.length} patterns terminée pour le projet ${projectId}`);
    } catch (error) {
      console.error('Erreur lors de l\'indexation des patterns:', error);
    }
  }
}