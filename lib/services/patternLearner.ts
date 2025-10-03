import { RAGService } from './ragService'
import { createClient } from '@/lib/supabase/client'
import { LearningSystem } from './learningSystem'
import { RuleOptimizer } from './ruleOptimizer'
import { claudeService } from './claudeService'

export interface LearnedRule {
  pattern: string;
  action: string; 
  confidence: number; // 0-1
  successCount: number;
  failureCount: number;
  lastUsed: Date;
  metadata?: Record<string, any>;
}

export class PatternLearner {
  private rag: RAGService;
  private learningSystem: LearningSystem;
  private ruleOptimizer: RuleOptimizer;
  private supabase = createClient();

  constructor(projectId: string) {
    this.rag = new RAGService();
    this.learningSystem = new LearningSystem(projectId);
    this.ruleOptimizer = new RuleOptimizer(projectId, process.env.ANTHROPIC_API_KEY || '');
  }

  async analyzeInteraction(userAction: any, context: any, success: boolean = false): Promise<LearnedRule[]> {
    try {
      console.log('🔍 Pattern Learner: Analyzing interaction', { action: userAction, success });

      // Étape 1: Extraire patterns du userAction avec Claude
      const extractedPatterns = await this.extractPatterns(userAction, context);

      // Étape 2: Chercher rules similaires via RAG
      const similarRules = await this.findSimilarRules(extractedPatterns, userAction.project_id || context.projectId);

      const updatedRules: LearnedRule[] = [];

      // Étape 3: Mettre à jour les rules existantes
      for (const rule of similarRules) {
        let updatedRule = { ...rule };

        if (success) {
          // Augmenter confiance pour succès
          updatedRule.successCount += 1;
          updatedRule.confidence = Math.min(1.0, rule.confidence + 0.1 * (1 - rule.confidence)); // Approche asymptotique vers 1
          updatedRule.lastUsed = new Date();
          
          // Enregistrer succès dans learning system
          await this.learningSystem.recordSuccess({
            technique: rule.pattern,
            context: context.type || 'general',
            payload: userAction.payload || '',
            impact: userAction.result || 'success'
          });
        } else {
          // Diminuer confiance pour échec
          updatedRule.failureCount += 1;
          updatedRule.confidence = Math.max(0.0, rule.confidence - 0.05); // Diminution graduelle
          updatedRule.lastUsed = new Date();
          
          // Enregistrer échec
          await this.learningSystem.recordFailure({
            technique: rule.pattern,
            context: context.type || 'general',
            payload: userAction.payload || '',
            reason: userAction.error || 'unknown'
          });
        }

        // Mettre à jour en base
        await this.supabase
          .from('learned_rules')
          .update(updatedRule)
          .eq('id', rule.id);

        updatedRules.push(updatedRule);
      }

      // Étape 4: Sauvegarder nouveaux patterns découverts
      await this.saveLearnedPatterns(extractedPatterns, userAction.project_id || context.projectId, success);

      // Auto-renforcement : Optimiser règles à faible confiance
      await this.autoReinforceLowConfidenceRules(updatedRules, context);

      console.log(`🔍 Pattern Learner: Updated ${updatedRules.length} rules, saved new patterns`);
      return updatedRules;

    } catch (error) {
      console.error('Erreur dans analyzeInteraction:', error);
      return [];
    }
  }

  private async extractPatterns(userAction: any, context: any): Promise<string[]> {
    try {
      // Utiliser Claude pour extraire patterns intelligents
      const prompt = `Extrait les patterns techniques de cette action de pentest:

Action: ${JSON.stringify(userAction)}
Contexte: ${JSON.stringify(context)}

Retourne seulement un tableau de strings avec les patterns identifiés (ex: "price-negative", "idor-user", "race-condition"). Max 5 patterns.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          maxTokens: 200,
          temperature: 0.1 
        })
      });

      if (!response.ok) {
        throw new Error('Erreur extraction patterns avec Claude');
      }

      const { content } = await response.json();

      // Parser comme array de strings
      const patterns = content.replace(/^\[.*\]$/, '').split(',').map(p => p.trim().replace(/["']/g, ''));
      return patterns.slice(0, 5);

    } catch (error) {
      console.error('Erreur extraction patterns:', error);
      
      // Fallback: patterns basiques depuis l'action
      const fallbackPatterns = [];
      if (userAction.payload?.includes('price') || userAction.payload?.includes('amount')) {
        fallbackPatterns.push('price-manipulation');
      }
      if (userAction.payload?.includes('id=') || userAction.target?.includes('/user/')) {
        fallbackPatterns.push('idor');
      }
      if (userAction.type === 'concurrency') {
        fallbackPatterns.push('race-condition');
      }
      return fallbackPatterns;
    }
  }

  private async findSimilarRules(patterns: string[], projectId: string): Promise<LearnedRule[]> {
    try {
      // Recherche RAG pour chaque pattern
      const allSimilar: LearnedRule[] = [];

      for (const pattern of patterns) {
        const similar = await this.rag.searchSimilar(
          `pentest rule pattern: ${pattern} action: testing vulnerability`,
          3,
          0.75,
          projectId
        );

        // Mapper vers LearnedRule
        const rules = similar.map((item: any): LearnedRule => ({
          pattern: item.content?.title || item.type || pattern,
          action: item.content?.description || 'test vulnerability',
          confidence: item.metadata?.confidence || 0.5,
          successCount: item.metadata?.successCount || 0,
          failureCount: item.metadata?.failureCount || 0,
          lastUsed: new Date(item.metadata?.lastUsed || Date.now()),
          metadata: item.metadata || {}
        }));

        allSimilar.push(...rules);
      }

      // Dédupliquer et trier par similarité/confiance
      const uniqueRules = allSimilar.filter((rule, index, self) => 
        index === self.findIndex(r => r.pattern === rule.pattern)
      ).sort((a, b) => b.confidence - a.confidence);

      return uniqueRules.slice(0, 5); // Top 5 similaires

    } catch (error) {
      console.error('Erreur recherche similar rules:', error);
      return [];
    }
  }

  private async saveLearnedPatterns(patterns: string[], projectId: string, success: boolean): Promise<void> {
    try {
      for (const pattern of patterns) {
        // Vérifier si pattern existe déjà
        const { data: existing } = await this.supabase
          .from('learned_rules')
          .select('id')
          .eq('project_id', projectId)
          .eq('pattern', pattern)
          .maybeSingle();

        const baseRule: LearnedRule = {
          pattern,
          action: `Discovered pattern: ${pattern}`,
          confidence: success ? 0.7 : 0.3,
          successCount: success ? 1 : 0,
          failureCount: success ? 0 : 1,
          lastUsed: new Date()
        };

        if (existing) {
          // Mettre à jour
          await this.supabase
            .from('learned_rules')
            .update(baseRule)
            .eq('id', existing.id);
        } else {
          // Créer nouveau
          await this.supabase
            .from('learned_rules')
            .insert({ ...baseRule, project_id: projectId });
        }

        // Stocker avec embedding via RAG
        await this.rag.storeWithEmbedding(
          { pattern, action: baseRule.action, success },
          { confidence: baseRule.confidence, project_id: projectId },
          projectId
        );
      }

    } catch (error) {
      console.error('Erreur sauvegarde patterns:', error);
    }
  }

  // Auto-renforcement silencieux : optimiser règles à faible confiance
  private async autoReinforceLowConfidenceRules(rules: LearnedRule[], context: any): Promise<void> {
    try {
      const lowConfidenceRules = rules.filter(rule => rule.confidence < 0.6 && rule.failureCount > 0);
      
      for (const rule of lowConfidenceRules) {
        const performance = {
          successRate: rule.successCount / (rule.successCount + rule.failureCount),
          recentFailures: [], // À implémenter avec historique récent
          context: context.type || 'general'
        };

        const optimizations = await this.ruleOptimizer.generateOptimization(rule, performance);
        
        // Appliquer la première optimisation prometteuse automatiquement si confiance haute
        if (optimizations.length > 0 && optimizations[0].confidence > 0.8) {
          console.log(`🔄 Auto-renforcement: Appliquant optimisation pour ${rule.pattern}`);
          // Mise à jour de la règle avec nouvelle action optimisée
          const optimizedRule = {
            ...rule,
            action: optimizations[0].implementation,
            confidence: Math.min(1.0, rule.confidence + 0.15) // Boost modéré
          };

          await this.supabase
            .from('learned_rules')
            .update(optimizedRule)
            .eq('id', rule.id || ''); // Assumer ID disponible

          // Enregistrer comme apprentissage
          await this.learningSystem.recordSuccess({
            technique: 'auto-optimization',
            context: 'reinforcement',
            impact: `Optimized ${rule.pattern} with ${Math.round(optimizations[0].confidence * 100)}% confidence`
          });
        }

        // Apprentissage silencieux : enregistrer interaction d'optimisation
        await this.learningSystem.recordSuccess({
          technique: 'background-learning',
          context: 'silent-reinforcement',
          impact: `Analyzed ${lowConfidenceRules.length} low-confidence rules`
        });
      }
    } catch (error) {
      console.error('Erreur auto-renforcement:', error);
    }
  }

  // Background learning silencieux (à appeler périodiquement)
  async backgroundLearning(): Promise<void> {
    try {
      console.log('🔄 Background learning: Analyse automatique des règles');

      // Récupérer toutes les règles du projet
      const { data: allRules } = await this.supabase
        .from('learned_rules')
        .select('*')
        .eq('project_id', this.learningSystem.projectId); // Assumer accès

      // Analyser et optimiser en batch
      const lowPerfRules = allRules?.filter(rule => rule.confidence < 0.7) || [];

      for (const rule of lowPerfRules.slice(0, 3)) { // Limiter à 3 par cycle
        const performance = await this.getRulePerformance(rule.id || '');
        await this.ruleOptimizer.generateOptimization(rule as any, performance);
      }

      console.log(`🔄 Background learning: Traité ${lowPerfRules.length} règles`);
    } catch (error) {
      console.error('Erreur background learning:', error);
    }
  }

  private async getRulePerformance(ruleId: string): Promise<any> {
    // Implémentation similaire à ruleOptimizer
    const patterns = await this.learningSystem.getTopPatterns();
    const rulePattern = patterns.find(p => p.id === ruleId);
    return {
      successRate: rulePattern?.success_rate || 0.5,
      recentFailures: rulePattern?.pattern_data?.recent_failures || [],
      context: rulePattern?.context || 'general'
    };
  }
}

// Hook pour utiliser le Pattern Learner
export function usePatternLearner(projectId: string) {
  return useMemo(() => new PatternLearner(projectId), [projectId]);
}