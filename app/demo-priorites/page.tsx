'use client'

import { useState } from 'react'

export default function DemoPrioritesPage() {
  const [selectedExample, setSelectedExample] = useState('securite')

  const examples = {
    securite: {
      title: "Dossier Sécurité",
      rules: [
        { priority: 1, rule: "Mettre # devant chaque faille trouvée pour bien les ranger", type: "STRUCTURE" },
        { priority: 2, rule: "Ajouter le niveau de criticité (Critique/Élevé/Moyen/Faible)", type: "CONTENU" },
        { priority: 3, rule: "Inclure la date de découverte", type: "STYLE" }
      ],
      aiReceives: `## RÈGLES À RESPECTER pour le dossier "Sécurité":
1. Mettre # devant chaque faille trouvée pour bien les ranger
2. Ajouter le niveau de criticité (Critique/Élevé/Moyen/Faible)
3. Inclure la date de découverte

RESPECTE CES RÈGLES ABSOLUMENT dans toutes tes actions.`,
      result: `# Faille XSS dans le formulaire de contact

**Niveau de criticité:** Élevé
**Date de découverte:** 27/09/2025

Description de la faille...`
    },
    documentation: {
      title: "Dossier Documentation",
      rules: [
        { priority: 1, rule: "Toujours créer des fichiers .md avec des titres # bien structurés", type: "STRUCTURE" },
        { priority: 2, rule: "Inclure un résumé en début de document", type: "CONTENU" },
        { priority: 3, rule: "Utiliser des emojis dans les titres pour plus de clarté", type: "STYLE" }
      ],
      aiReceives: `## RÈGLES À RESPECTER pour le dossier "Documentation":
1. Toujours créer des fichiers .md avec des titres # bien structurés
2. Inclure un résumé en début de document
3. Utiliser des emojis dans les titres pour plus de clarté

RESPECTE CES RÈGLES ABSOLUMENT dans toutes tes actions.`,
      result: `# 📚 Guide d'Installation

## Résumé
Ce document explique comment installer et configurer l'application...

## 🚀 Installation
...

## ⚙️ Configuration
...`
    },
    global: {
      title: "Règles Globales (*)",
      rules: [
        { priority: 1, rule: "Demander confirmation avant de supprimer quoi que ce soit", type: "SÉCURITÉ" },
        { priority: 2, rule: "Toujours expliquer les actions effectuées", type: "TRANSPARENCE" },
        { priority: 3, rule: "Utiliser un ton professionnel mais amical", type: "COMMUNICATION" }
      ],
      aiReceives: `## RÈGLES À RESPECTER pour le dossier "général":
1. Demander confirmation avant de supprimer quoi que ce soit
2. Toujours expliquer les actions effectuées
3. Utiliser un ton professionnel mais amical

RESPECTE CES RÈGLES ABSOLUMENT dans toutes tes actions.`,
      result: `Je vais créer le document que vous avez demandé.

**Action effectuée:** Création du fichier "rapport.md" dans le dossier Documentation
**Contenu:** Structure avec titre, résumé et sections principales

Le document a été créé avec succès ! Souhaitez-vous que j'y ajoute du contenu spécifique ?`
    }
  }

  const currentExample = examples[selectedExample]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Démonstration du Système de Priorités
          </h1>
          <p className="text-gray-600">
            Voyez comment l'IA reçoit et applique les règles selon leur priorité
          </p>
        </div>

        {/* Sélecteur d'exemple */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Choisissez un exemple :</h2>
          <div className="flex gap-4">
            {Object.entries(examples).map(([key, example]) => (
              <button
                key={key}
                onClick={() => setSelectedExample(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedExample === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {example.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Configuration des règles */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚙️ Configuration des Règles
            </h3>
            
            <div className="space-y-4">
              {currentExample.rules.map((rule, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      Priorité {rule.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.type === 'STRUCTURE' ? 'bg-red-100 text-red-700' :
                      rule.type === 'CONTENU' ? 'bg-yellow-100 text-yellow-700' :
                      rule.type === 'STYLE' ? 'bg-green-100 text-green-700' :
                      rule.type === 'SÉCURITÉ' ? 'bg-red-100 text-red-700' :
                      rule.type === 'TRANSPARENCE' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {rule.type}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    "{rule.rule}"
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Logique de Priorité</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Priorité 1:</strong> Règles CRITIQUES (structure, sécurité)</li>
                <li>• <strong>Priorité 2:</strong> Règles IMPORTANTES (contenu, fonctionnalité)</li>
                <li>• <strong>Priorité 3:</strong> Règles UTILES (style, présentation)</li>
              </ul>
            </div>
          </div>

          {/* Ce que reçoit l'IA */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🤖 Ce que reçoit l'IA
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap text-gray-800">
                  {currentExample.aiReceives}
                </pre>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ✅ Résultat de l'IA
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">
                  {currentExample.result}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Explication détaillée */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Comment ça fonctionne</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                1
              </div>
              <h4 className="font-medium mb-2">Tri par Priorité</h4>
              <p className="text-sm text-gray-600">
                Les règles sont triées par priorité croissante (1, 2, 3...)
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                2
              </div>
              <h4 className="font-medium mb-2">Envoi à l'IA</h4>
              <p className="text-sm text-gray-600">
                Les règles sont ajoutées au message utilisateur dans l'ordre
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                3
              </div>
              <h4 className="font-medium mb-2">Application</h4>
              <p className="text-sm text-gray-600">
                L'IA respecte TOUTES les règles, en privilégiant les priorités 1
              </p>
            </div>
          </div>
        </div>

        {/* Conseils pratiques */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            💡 Conseils pour bien utiliser les priorités
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-yellow-800">
            <div>
              <h4 className="font-medium mb-2">✅ Bonnes Pratiques :</h4>
              <ul className="text-sm space-y-1">
                <li>• Priorité 1 : Règles de structure/format</li>
                <li>• Priorité 2 : Règles de contenu</li>
                <li>• Priorité 3 : Règles de style</li>
                <li>• Maximum 5 règles par dossier</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">❌ À Éviter :</h4>
              <ul className="text-sm space-y-1">
                <li>• Trop de règles priorité 1</li>
                <li>• Règles contradictoires</li>
                <li>• Règles trop complexes</li>
                <li>• Plus de 10 règles total</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
