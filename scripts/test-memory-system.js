const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irgyhtvkgqwsgbgobqjj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testMemorySystem() {
  console.log('🔍 Test du système de mémoire...\n')

  // 1. Récupérer le projet actif
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1)
    .single()

  if (projectError) {
    console.error('❌ Erreur lors de la récupération du projet:', projectError)
    return
  }

  const projectId = projects.id
  console.log(`📁 Projet actif: ${projects.name} (${projectId})\n`)

  // 2. Lister les documents mémoire existants
  const { data: memoryNodes, error: nodesError } = await supabase
    .from('memory_nodes')
    .select('id, name, type, content, created_at, updated_at')
    .eq('project_id', projectId)
    .order('name')

  if (nodesError) {
    console.error('❌ Erreur lors de la récupération des nœuds:', nodesError)
    return
  }

  console.log(`📚 Documents mémoire existants (${memoryNodes.length}):\n`)

  for (const node of memoryNodes) {
    const icon = node.type === 'folder' ? '📁' : '📄'
    const contentPreview = node.content
      ? (typeof node.content === 'string' ? node.content : JSON.stringify(node.content))
          .substring(0, 100)
          .replace(/\n/g, ' ')
      : '(vide)'

    console.log(`${icon} ${node.name}`)
    console.log(`   ID: ${node.id}`)
    console.log(`   Type: ${node.type}`)
    console.log(`   Contenu: ${contentPreview}${node.content && node.content.length > 100 ? '...' : ''}`)
    console.log(`   Créé: ${new Date(node.created_at).toLocaleString('fr-FR')}`)
    console.log(`   Modifié: ${new Date(node.updated_at).toLocaleString('fr-FR')}`)
    console.log('')
  }

  // 3. Chercher spécifiquement ezazea et eazzaeaze
  console.log('🔎 Recherche des documents spécifiques:\n')

  const targetDocs = ['ezazea', 'eazzaeaze']
  for (const docName of targetDocs) {
    const { data: doc, error: docError } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', docName)
      .single()

    if (doc) {
      console.log(`✅ Document "${docName}" trouvé:`)
      console.log(`   Contenu complet: ${doc.content}`)
    } else {
      console.log(`❌ Document "${docName}" non trouvé`)
      if (docError) console.log(`   Erreur: ${docError.message}`)
    }
    console.log('')
  }

  // 4. Test de création/mise à jour
  console.log('🧪 Test de mise à jour du document "ezazea":\n')

  const testContent = `# ezazea\nTaille: 170cm\nAge: 26 ans\nTest: ${new Date().toISOString()}`

  // Chercher si ezazea existe
  const { data: existing } = await supabase
    .from('memory_nodes')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', 'ezazea')
    .single()

  if (existing) {
    // Mettre à jour
    const { error: updateError } = await supabase
      .from('memory_nodes')
      .update({
        content: testContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError)
    } else {
      console.log('✅ Document "ezazea" mis à jour avec succès')
    }
  } else {
    // Créer
    const { error: createError } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name: 'ezazea',
        type: 'document',
        content: testContent,
        color: '#6E6E80'
      })

    if (createError) {
      console.error('❌ Erreur lors de la création:', createError)
    } else {
      console.log('✅ Document "ezazea" créé avec succès')
    }
  }

  console.log('\n✨ Test terminé!')
}

testMemorySystem()