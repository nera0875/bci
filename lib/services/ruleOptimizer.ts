import { Anthropic } from '@anthropic-ai/sdk'
import { LearningSystem } from './learningSystem'
import { createClient } from '@/lib/supabase/client'

export interface OptimizationSuggestion {
  suggestion: string;
  expectedImprovement: string;
  implementation: string;
  confidence: number; // 0-1
  rationale: string;
}

export class RuleOptimizer {
  private claude: Anthropic;
  private learningSystem: LearningSystem;
  private supabase = createClient();

  constructor(projectId: string, claudeApiKey: string) {
    this.claude = new Anthropic({ apiKey: claudeApiKey });
    this.learningSystem = new LearningSystem(projectId);
  }

  async generateOptimization(
    currentRule: { pattern: string; action: string; confidence: number; successCount: number; failureCount: number },
    performance: { successRate: number; recentFailures: any[]; context: string }
  ): Promise<OptimizationSuggestion[]> {
    try {
      console.log('🔧 Rule Optimizer: Generating optimizations for rule', currentRule.pattern);

      // Étape 1: Analyser performance avec LearningSystem
      const effectiveness = await this.learningSystem.predictEffectiveness(currentRule.pattern, performance.context);
      const topAlternatives = await this.learningSystem.getPredictions(performance.context, 3);

      // Étape 2: Créer prompt pour Claude
      const prompt = `Analyse la performance de cette règle de pentest et suggère 3 améliorations spécifiques pour atteindre 90%+ de taux de succès.

Règle actuelle: 
- Pattern: ${currentRule.pattern}
- Action: ${currentRule.action}
- Confiance actuelle: ${Math.round(currentRule.confidence * 100)}%
- Succès: ${currentRule.successCount}
- Échecs: ${currentRule.failureCount}
- Taux de succès récent: ${Math.round(performance.successRate * 100)}%
- Échecs récents: ${JSON.stringify(performance.recentFailures.slice(-3))}

Contexte: ${performance.context}

Alternatives prometteuses: ${topAlternatives.map(a => `${a.technique} (${Math.round(a.confidence * 100)}%)`).join(', ')}

Suggère exactement 3 améliorations spécifiques:
1. Modification du payload ou approche
2. Technique complémentaire ou alternative
3. Stratégie d'évasion (WAF, validation, etc.)

Pour chaque suggestion, fournis:
- Description détaillée
- Amélioration attendue (ex: +20% succès)
- Implémentation (code/payload exemple)
- Rationale basée sur l'analyse

Retourne en JSON array d'objets avec: suggestion, expectedImprovement, implementation, rationale`

      // Appel à Claude
      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      });

      if (!response.content || !response.content[0].text) {
        throw new Error('Réponse Claude invalide');
      }

      // Parser JSON
      let suggestions: OptimizationSuggestion[];
      try {
        const parsed = JSON.parse(response.content[0].text);
        suggestions = parsed;
      } catch (parseError) {
        console.warn('Erreur parsing JSON Claude, fallback à suggestions basiques');
        suggestions = this.generateFallbackSuggestions(currentRule, performance);
      }

      // Étape 3: Calculer confiance des suggestions
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        // Confiance basée sur similarité avec alternatives performantes
        const matchingAlt = topAlternatives.find(alt => 
          suggestion.suggestion.toLowerCase().includes(alt.technique.toLowerCase())
        );
        suggestion.confidence = matchingAlt ? matchingAlt.confidence * 0.9 + effectiveness * 0.1 : 0.6;
      }

      // Trier par confiance
      suggestions.sort((a, b) => b.confidence - a.confidence);

      // Étape 4: Stocker les suggestions pour apprentissage futur
      await this.storeSuggestions(suggestions, currentRule.pattern, performance.context);

      console.log(`🔧 Rule Optimizer: Generated ${suggestions.length} suggestions with avg confidence ${Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length * 100)}%`);
      return suggestions.slice(0, 3);

    } catch (error) {
      console.error('Erreur generateOptimization:', error);
      return this.generateFallbackSuggestions(currentRule, performance);
    }
  }

  private generateFallbackSuggestions(
    currentRule: any,
    performance: any
  ): OptimizationSuggestion[] {
    const fallbacks: OptimizationSuggestion[] = [];

    // Suggestions basiques basées sur performance
    if (performance.successRate < 0.5) {
      fallbacks.push({
        suggestion: 'Augmenter la complexité du payload avec obfuscation',
        expectedImprovement: '+25% taux de succès en évitant détections simples',
        implementation: `payload = base64_encode(original_payload) + random_noise`,
        rationale: 'Les échecs récents suggèrent une détection basique; l\'obfuscation peut contourner.',
        confidence: 0.7
      });
    }

    if (currentRule.failureCount > currentRule.successCount * 2) {
      fallbacks.push({
        suggestion: 'Combiner avec technique complémentaire (ex: timing attack)',
        expectedImprovement: '+30% en exploitant faiblesses orthogonales',
        implementation: `sequential_attack(technique1, technique2) avec délai 100-500ms`,
        rationale: 'Règle isolée inefficace; combinaison augmente surface d\'attaque.',
        confidence: 0.75
      });
    }

    fallbacks.push({
      suggestion: 'Ajuster paramètres basés sur réponses serveur récentes',
      expectedImprovement: '+15% adaptation dynamique',
      implementation: `parse_response_headers() et ajuster payload dynamiquement`,
      rationale: 'Apprentissage des réponses pour adaptation en temps réel.',
      confidence: 0.6
    });

    return fallbacks;
  }

  private async storeSuggestions(
    suggestions: OptimizationSuggestion[],
    rulePattern: string,
    context: string
  ): Promise<void> {
    try {
      for (const suggestion of suggestions) {
        await this.supabase.from('optimization_suggestions').upsert({
          project_id: this.learningSystem.projectId, // Assuming access
          rule_pattern: rulePattern,
          context,
          suggestion: suggestion.suggestion,
          expected_improvement: suggestion.expectedImprovement,
          implementation: suggestion.implementation,
          rationale: suggestion.rationale,
          confidence: suggestion.confidence,
          created_at: new Date().toISOString()
        });
      }

      // Enregistrer comme pattern d'apprentissage
      await this.learningSystem.recordSuccess({
        technique: 'rule-optimization',
        context: 'learning',
        impact: `Generated ${suggestions.length} suggestions`
      });

    } catch (error) {
      console.error('Erreur stockage suggestions:', error);
    }
  }

  // Obtenir suggestions d'optimisation pour une règle spécifique
  async getRuleOptimizations(ruleId: string, limit: number = 3): Promise<OptimizationSuggestion[]> {
    try {
      // Chercher suggestions existantes
      const { data } = await this.supabase
        .from('optimization_suggestions')
        .select('*')
        .eq('rule_id', ruleId) // Assuming rule_id field
        .order('confidence', { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        return data.map((s: any): OptimizationSuggestion => ({
          suggestion: s.suggestion,
          expectedImprovement: s.expected_improvement,
          implementation: s.implementation,
          rationale: s.rationale,
          confidence: s.confidence
        }));
      }

      // Si pas de suggestions, générer nouvelles
      const rule = await this.getRuleById(ruleId);
      const performance = await this.getRulePerformance(ruleId);
      
      return await this.generateOptimization(rule, performance);

    } catch (error) {
      console.error('Erreur getRuleOptimizations:', error);
      return [];
    }
  }

  private async getRuleById(ruleId: string): Promise<any> {
    const { data } = await this.supabase
      .from('learned_rules')
      .select('*')
      .eq('id', ruleId)
      .single();
    return data;
  }

  private async getRulePerformance(ruleId: string): Promise<any> {
    // Utiliser learning system pour performance
    const patterns = await this.learningSystem.getTopPatterns();
    const rulePattern = patterns.find(p => p.id === ruleId);
    
    return {
      successRate: rulePattern?.success_rate || 0.5,
      recentFailures: rulePattern?.pattern_data?.recent_failures || [],
      context: rulePattern?.context || 'general'
    };
  }
}

// Hook pour utiliser le Rule Optimizer
export function useRuleOptimizer(projectId: string, claudeApiKey: string) {
  return useMemo(() => new RuleOptimizer(projectId, claudeApiKey), [projectId, claudeApiKey]);
}