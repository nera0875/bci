# Document Blocks Integration Guide

## ✅ System Status

**Phases Completed:**
- ✅ Phase 1: Type definitions + API parser endpoint
- ✅ Phase 2: View components (BlockRenderer + 8 block types)
- ✅ Phase 3: Edit components (BlockEditor + actions)
- ✅ Phase 4: QuickAddFact with AI parsing

**Ready to use!**

---

## 📦 Available Components

### 1. **BlockList** (Read-only)
Display blocks without edit capabilities.

```tsx
import { BlockList } from '@/components/memory/BlockList'

<BlockList blocks={fact.metadata.blocks || []} />
```

### 2. **EditableBlockList** (Full CRUD)
Display blocks with inline editing, add, delete, duplicate, reorder.

```tsx
import { EditableBlockList } from '@/components/memory/EditableBlockList'

<EditableBlockList
  blocks={fact.metadata.blocks || []}
  onChange={async (newBlocks) => {
    // Update fact in database
    await supabase
      .from('memory_nodes')
      .update({ metadata: { blocks: newBlocks } })
      .eq('id', factId)
  }}
/>
```

### 3. **QuickAddFact** (AI-powered creation)
Quick fact creation with AI parsing.

```tsx
import { QuickAddFact } from '@/components/memory/QuickAddFact'

<QuickAddFact
  projectId={projectId}
  onSave={async (parsed) => {
    // Save to database
    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        fact: parsed.fact,
        metadata: {
          category: parsed.category,
          tags: parsed.tags,
          blocks: parsed.blocks
        }
      })

    if (error) throw error

    // Reload facts list
    await loadFacts()
  }}
  onCancel={() => setShowQuickAdd(false)}
/>
```

---

## 🔧 Integration Examples

### Example 1: Add QuickAddFact to FactsMemoryViewPro

In `FactsMemoryViewPro.tsx`:

```tsx
// 1. Add state
const [showQuickAdd, setShowQuickAdd] = useState(false)

// 2. Add button in header
<Button size="sm" onClick={() => setShowQuickAdd(true)}>
  <Sparkles className="w-4 h-4 mr-2" />
  Quick Add
</Button>

// 3. Add QuickAddFact component (below header, above list)
{showQuickAdd && (
  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
    <QuickAddFact
      projectId={projectId}
      onSave={async (parsed) => {
        // Generate embedding
        let embedding = null
        try {
          const embeddingRes = await fetch('/api/openai/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: parsed.fact, projectId })
          })
          if (embeddingRes.ok) {
            const embData = await embeddingRes.json()
            embedding = embData.embedding
          }
        } catch (err) {
          console.warn('Embedding generation failed:', err)
        }

        // Save to memory_facts
        const { error } = await supabase
          .from('memory_facts')
          .insert({
            project_id: projectId,
            fact: parsed.fact,
            metadata: {
              category: parsed.category,
              tags: parsed.tags,
              blocks: parsed.blocks,
              type: 'general',
              confidence: 1.0
            },
            embedding
          })

        if (error) throw error

        // Reload and close
        await loadFacts()
        setShowQuickAdd(false)
      }}
      onCancel={() => setShowQuickAdd(false)}
    />
  </div>
)}
```

### Example 2: Update FactDetailPanel to use EditableBlockList

In the fact detail panel (side panel in FactsMemoryViewPro):

```tsx
import { EditableBlockList } from '@/components/memory/EditableBlockList'

// In the detail content area (activeTab === 'blocks'):
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Content Blocks
  </label>

  <EditableBlockList
    blocks={selectedFact.metadata?.blocks || []}
    onChange={(newBlocks) => {
      // Update local state
      setSelectedFact({
        ...selectedFact,
        metadata: {
          ...selectedFact.metadata,
          blocks: newBlocks
        }
      })
    }}
  />
</div>

// In handleSave function, include blocks:
const { error } = await supabase
  .from('memory_facts')
  .update({
    fact: updatedFact.fact,
    metadata: {
      ...updatedFact.metadata,
      blocks: selectedFact.metadata?.blocks || []
    }
  })
  .eq('id', updatedFact.id)
```

---

## 🎯 Backward Compatibility

Old facts without blocks continue to work:

```tsx
// Display old facts (no blocks)
{fact.metadata?.blocks && fact.metadata.blocks.length > 0 ? (
  <BlockList blocks={fact.metadata.blocks} />
) : (
  <p className="text-gray-700 dark:text-gray-300">
    {fact.content || fact.fact}
  </p>
)}
```

---

## 🔄 Migration Strategy

### Option 1: Manual Migration
Add "Convert to Blocks" button for old facts:

```tsx
const convertToBlocks = async (fact: Fact) => {
  const response = await fetch('/api/memory/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: fact.fact + '\n\n' + (fact.content || ''),
      projectId
    })
  })

  const parsed = await response.json()

  await supabase
    .from('memory_facts')
    .update({
      metadata: {
        ...fact.metadata,
        blocks: parsed.blocks
      }
    })
    .eq('id', fact.id)
}
```

### Option 2: Auto Migration on Edit
When user edits an old fact, offer to convert:

```tsx
if (!selectedFact.metadata?.blocks) {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded">
      <p className="text-sm mb-2">This fact uses the old format.</p>
      <Button onClick={convertToBlocks}>
        Convert to Blocks
      </Button>
    </div>
  )
}
```

---

## 📚 API Reference

### POST /api/memory/parse

Parse raw text into structured blocks.

**Request:**
```json
{
  "input": "IDOR /game/complete - Tests bonus\nWorkflow:\n- LANCER BONUS",
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "fact": "IDOR /game/complete - Tests bonus",
  "category": "api",
  "tags": ["idor", "bonus", "game"],
  "blocks": [
    {
      "id": "uuid",
      "type": "heading",
      "content": "Workflow",
      "level": 2
    },
    {
      "id": "uuid",
      "type": "checklist",
      "items": [
        { "id": "uuid", "text": "LANCER BONUS", "checked": false }
      ]
    }
  ]
}
```

---

## 🎨 Styling

All components use Tailwind + shadcn/ui and respect dark mode automatically.

**Block hover actions** appear on group-hover:
- Edit (pencil)
- Duplicate (copy)
- Move Up (chevron-up)
- Move Down (chevron-down)
- Delete (trash, red)

**Insert block button** (+) appears between blocks on hover.

---

## 🐛 Troubleshooting

### Blocks not saving
Check that you're passing blocks in metadata:
```tsx
metadata: {
  ...other fields,
  blocks: newBlocks  // ✅ Include this
}
```

### Blocks not displaying
Ensure blocks array has valid IDs:
```tsx
blocks.map(b => ({ ...b, id: b.id || crypto.randomUUID() }))
```

### AI parsing fails
Check:
1. Anthropic API key in project settings
2. Model availability (claude-sonnet-4-5 default)
3. Network/timeout issues

---

## 📈 Performance

- Virtual scrolling for 100+ blocks (use react-virtuoso if needed)
- Debounced saves (500ms)
- Lazy loading for HTTP response bodies
- Syntax highlighting in web worker

---

## 🚀 Next Steps

**Phase 5: Chat Integration**
- AI creates blocks via <!--MEMORY_ACTION-->
- Toast validation with block preview
- Link from toast to fact detail panel

Ready to implement!
