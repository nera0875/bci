import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required');
}

const client = new Anthropic({
  apiKey,
});

// Modèles disponibles : Priorité à claude-3-5-sonnet-20241022, fallback à claude-3-5-haiku-20241022
// Claude 4.5 n'existe pas encore, donc fallback automatique.
const getPreferredModel = (): string => {
  const preferredModel = 'claude-3-5-sonnet-20241022';
  const fallbackModel = 'claude-3-5-haiku-20241022';
  
  // Vérification simple : on assume que sonnet est disponible, sinon fallback
  // En pratique, on pourrait tester via une requête, mais pour l'instant, on utilise sonnet par défaut
  console.log('Utilisation du modèle :', preferredModel);
  return preferredModel;
};

export const claudeService = {
  // Fonction pour envoyer un message à Claude
  async chat(messages: Array<{role: 'user' | 'assistant'; content: string}>, options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const model = options?.model || getPreferredModel();
    const maxTokens = options?.maxTokens || 1024;
    const temperature = options?.temperature || 0.7;

    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      if (response.content && response.content.length > 0) {
        return response.content[0].text;
      }

      return 'Réponse vide de Claude.';
    } catch (error) {
      console.error('Erreur lors de l\'appel à Claude :', error);
      
      // Fallback : si sonnet échoue, essayer haiku
      if (model === getPreferredModel() && error instanceof Error && error.message.includes('model')) {
        console.log('Fallback vers le modèle haiku...');
        return this.chat(messages, { model: fallbackModel, ...options });
      }
      
      throw error;
    }
  },

  // Fonction pour vérifier la disponibilité d'un modèle
  async checkModelAvailability(model: string): Promise<boolean> {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Test' }]
      });
      return true;
    } catch (error) {
      console.error(`Modèle ${model} non disponible :`, error);
      return false;
    }
  },

  // Fonction pour obtenir les modèles disponibles (liste statique pour l'instant)
  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229' // Ancien mais puissant si besoin
    ];
  }
};