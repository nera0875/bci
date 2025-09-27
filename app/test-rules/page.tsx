'use client'

import { SimpleRulesManager } from '@/components/rules/SimpleRulesManager'
import { useState } from 'react'

export default function TestRulesPage() {
  // Pour la démo, utilisons un projectId fictif
  const [projectId] = useState('demo-project-123')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test du Système de Règles Simplifié
          </h1>
          <p className="text-gray-600">
            Créez et gérez des règles simples que l'IA doit respecter par dossier.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Comment ça fonctionne :</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <p>Créez une règle simple en français (ex: "Toujours créer des fichiers .md avec des titres # bien structurés")</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <p>Choisissez le dossier où elle s'applique (ou "*" pour tous les dossiers)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <p>L'IA recevra automatiquement ces règles dans le chat et les respectera</p>
            </div>
          </div>
        </div>

        <SimpleRulesManager projectId={projectId} />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ✅ Avantages du nouveau système :
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Simple :</strong> Juste une phrase en français</li>
            <li>• <strong>Flexible :</strong> Règles par dossier ou globales</li>
            <li>• <strong>Automatique :</strong> L'IA les reçoit automatiquement</li>
            <li>• <strong>Priorités :</strong> Ordre d'application des règles</li>
            <li>• <strong>Activation/Désactivation :</strong> Contrôle facile</li>
          </ul>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            📝 Exemples de règles efficaces :
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-yellow-800">
            <div>
              <h4 className="font-medium mb-2">Documentation :</h4>
              <ul className="text-sm space-y-1">
                <li>• "Toujours créer des fichiers .md avec des titres # bien structurés"</li>
                <li>• "Ajouter une table des matières pour les longs documents"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sécurité :</h4>
              <ul className="text-sm space-y-1">
                <li>• "Mettre # devant chaque faille trouvée pour bien les ranger"</li>
                <li>• "Toujours inclure le niveau de criticité (Critique/Élevé/Moyen/Faible)"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Code :</h4>
              <ul className="text-sm space-y-1">
                <li>• "Ajouter des commentaires en français dans le code"</li>
                <li>• "Respecter les conventions de nommage camelCase"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Global :</h4>
              <ul className="text-sm space-y-1">
                <li>• "Demander confirmation avant de supprimer quoi que ce soit"</li>
                <li>• "Toujours expliquer les actions effectuées"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
