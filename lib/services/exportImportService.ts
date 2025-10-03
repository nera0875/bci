import { supabase } from '@/lib/supabase/client'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface ExportData {
  version: string
  exported_at: string
  project: {
    id: string
    name: string
  }
  memory: any[]
  rules: any[]
  learning: any[]
}

/**
 * Export project data to .bci file (ZIP containing JSON + MD files)
 */
export async function exportProject(projectId: string, projectName: string) {
  try {
    // 1. Load all data
    const [memoryRes, rulesRes, learningRes] = await Promise.all([
      supabase.from('memory_nodes').select('*').eq('project_id', projectId),
      supabase.from('rules').select('*').eq('project_id', projectId),
      supabase.from('attack_patterns').select('*').eq('project_id', projectId)
    ])

    // 2. Build export structure
    const exportData: ExportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      project: {
        id: projectId,
        name: projectName
      },
      memory: buildMemoryTree(memoryRes.data || []),
      rules: rulesRes.data || [],
      learning: learningRes.data || []
    }

    // 3. Create ZIP file
    const zip = new JSZip()

    // Add main data file
    zip.file('data.json', JSON.stringify(exportData, null, 2))

    // Add markdown files for documents
    const documents = memoryRes.data?.filter(n => n.type === 'document') || []
    if (documents.length > 0) {
      const docsFolder = zip.folder('documents')
      documents.forEach(doc => {
        if (doc.content) {
          docsFolder?.file(`${doc.id}.md`, doc.content)
        }
      })
    }

    // Add rules as markdown
    const rulesFolder = zip.folder('rules')
    const rules = rulesRes.data || []
    rules.forEach((rule, idx) => {
      const content = `# ${rule.name}

**Trigger:** ${rule.trigger}
**Priority:** ${rule.priority}
**Enabled:** ${rule.enabled}

## Action
${rule.action}

## Metadata
- Created: ${rule.created_at}
- Updated: ${rule.updated_at}
`
      rulesFolder?.file(`${idx + 1}_${rule.name.replace(/[^a-z0-9]/gi, '_')}.md`, content)
    })

    // 4. Generate and download
    const blob = await zip.generateAsync({ type: 'blob' })
    const fileName = `export_${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.bci`
    saveAs(blob, fileName)

    return { success: true, fileName }
  } catch (error) {
    console.error('Export error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Import project data from .bci file
 */
export async function importProject(file: File, targetProjectId: string) {
  try {
    // 1. Read ZIP file
    const zip = await JSZip.loadAsync(file)

    // 2. Extract data.json
    const dataFile = zip.file('data.json')
    if (!dataFile) {
      throw new Error('Invalid .bci file: missing data.json')
    }

    const dataContent = await dataFile.async('string')
    const data: ExportData = JSON.parse(dataContent)

    // 3. Validate version
    if (data.version !== '1.0') {
      throw new Error(`Unsupported version: ${data.version}`)
    }

    // 4. Import memory nodes
    const nodeIdMap = new Map<string, string>() // old ID -> new ID

    for (const node of data.memory) {
      const oldId = node.id
      const { id, project_id, ...nodeData } = node

      // Create new node
      const { data: newNode, error } = await supabase
        .from('memory_nodes')
        .insert({
          ...nodeData,
          project_id: targetProjectId,
          parent_id: node.parent_id ? nodeIdMap.get(node.parent_id) || null : null
        })
        .select()
        .single()

      if (newNode && !error) {
        nodeIdMap.set(oldId, newNode.id)
      }
    }

    // 5. Import rules
    for (const rule of data.rules) {
      const { id, project_id, created_at, updated_at, ...ruleData } = rule

      // Map target_folder_id if exists
      if (rule.target_folder_id && nodeIdMap.has(rule.target_folder_id)) {
        ruleData.target_folder_id = nodeIdMap.get(rule.target_folder_id)
      }

      await supabase
        .from('rules')
        .insert({
          ...ruleData,
          project_id: targetProjectId
        })
    }

    // 6. Import learning patterns
    for (const pattern of data.learning) {
      const { id, project_id, ...patternData } = pattern

      await supabase
        .from('attack_patterns')
        .insert({
          ...patternData,
          project_id: targetProjectId
        })
    }

    return {
      success: true,
      imported: {
        nodes: data.memory.length,
        rules: data.rules.length,
        patterns: data.learning.length
      }
    }
  } catch (error) {
    console.error('Import error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Build hierarchical memory tree
 */
function buildMemoryTree(nodes: any[]): any[] {
  const nodeMap = new Map<string, any>()
  const roots: any[] = []

  // Create map
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  // Build tree
  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id)!
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!
      parent.children.push(treeNode)
    } else {
      roots.push(treeNode)
    }
  })

  // Sort by position
  const sortChildren = (node: any) => {
    node.children.sort((a: any, b: any) => a.position - b.position)
    node.children.forEach(sortChildren)
  }
  roots.forEach(sortChildren)

  // Flatten tree with hierarchy preserved
  const flatten = (nodes: any[], result: any[] = []): any[] => {
    nodes.forEach(node => {
      const { children, ...nodeData } = node
      result.push(nodeData)
      if (children.length > 0) {
        flatten(children, result)
      }
    })
    return result
  }

  return flatten(roots)
}

export const exportImportService = {
  exportProject,
  importProject
}