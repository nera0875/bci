const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/chat/QuickContextBar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter l'import de PlaybookBuilderV2 après les autres imports
content = content.replace(
  "import { CSS } from '@dnd-kit/utilities'",
  `import { CSS } from '@dnd-kit/utilities'
import { PlaybookBuilderV2 } from '@/components/rules/PlaybookBuilderV2'`
);

// 2. Ajouter les états editingRule et showBuilder après viewingRule
content = content.replace(
  /const \[viewingRule, setViewingRule\] = React\.useState<any \| null>\(null\)/,
  `const [viewingRule, setViewingRule] = React.useState<any | null>(null)
  const [editingRule, setEditingRule] = React.useState<any | null>(null)
  const [showBuilder, setShowBuilder] = React.useState(false)`
);

// 3. Remplacer handleEditRule pour ouvrir le builder au lieu du toast
content = content.replace(
  /const handleEditRule = \(rule: any\) => \{[\s\S]*?toast\.info\('Ouvre Rules & Playbooks pour éditer'\)\s*\}/,
  `const handleEditRule = (rule: any) => {
    setEditingRule(rule)
    setShowBuilder(true)
    setViewingRule(null) // Fermer le modal de détails si ouvert
  }`
);

// 4. Ajouter la fonction handleSaveRule après handleDeleteRule
const handleSaveRuleCode = `
  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule?.id) {
        const { error } = await supabase
          .from('rules')
          .update({
            name: ruleData.name,
            description: ruleData.description,
            icon: ruleData.icon,
            category_id: ruleData.category_id,
            trigger: ruleData.trigger_config?.keywords?.join(', ') || 'manual',
            action: ruleData.action_instructions || ruleData.action_config?.instructions || ruleData.description || 'Execute rule',
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_categories: ruleData.target_categories,
            target_tags: ruleData.target_tags,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
            action_instructions: ruleData.action_instructions,
            enabled: ruleData.enabled
          })
          .eq('id', editingRule.id)

        if (error) throw error
        toast.success('Rule mise à jour !')
      } else {
        const { error } = await supabase
          .from('rules')
          .insert({
            project_id: projectId,
            name: ruleData.name,
            description: ruleData.description,
            icon: ruleData.icon || '🎯',
            category_id: ruleData.category_id,
            trigger: ruleData.trigger_config?.keywords?.join(', ') || 'manual',
            action: ruleData.action_instructions || ruleData.action_config?.instructions || ruleData.description || 'Execute rule',
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_categories: ruleData.target_categories,
            target_tags: ruleData.target_tags,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
            action_instructions: ruleData.action_instructions,
            enabled: false,
            priority: rules.length + 1
          })

        if (error) throw error
        toast.success('Rule créée !')
      }

      setShowBuilder(false)
      setEditingRule(null)
      await loadRules()
    } catch (error: any) {
      console.error('Error saving rule:', error)
      toast.error(\`Erreur sauvegarde: \${error.message || 'Unknown'}\`)
    }
  }
`;

content = content.replace(
  /const handleDeleteRule = async \(ruleId: string\) => \{[\s\S]*?\}\s*\}/,
  match => match + '\n' + handleSaveRuleCode
);

// 5. Ajouter le modal PlaybookBuilder avant la fermeture du dernier div (avant le dernier </div> avant </div>)
// On l'ajoute juste après le modal de viewingRule (avant les derniers </div>)
const playbookBuilderModal = `
      {/* Builder Modal */}
      {showBuilder && (
        <PlaybookBuilderV2
          projectId={projectId}
          initialData={editingRule || undefined}
          onSave={handleSaveRule}
          onCancel={() => { setShowBuilder(false); setEditingRule(null); }}
        />
      )}`;

// Trouver où insérer le modal (juste avant </div> final)
content = content.replace(
  /([\s]*)<\/div>\s*<\/div>\s*\)\s*\}\s*$/,
  `$1${playbookBuilderModal}
$1</div>
    </div>
  )
}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Added edit functionality to QuickContextBar.tsx');
