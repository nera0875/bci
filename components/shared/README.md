# 🎨 Shared Components - Notion-style Design System

Composants génériques réutilisables pour un système unifié et professionnel.

---

## 📦 Composants disponibles

### 1. **EmojiPicker** - Sélecteur d'emoji

```tsx
import { EmojiPicker } from '@/components/shared'

<EmojiPicker
  value="🔥"
  onChange={(emoji) => setIcon(emoji)}
  suggestions={['🔐', '🔌', '🧠', '📢']}  // Optional
  size="md"                                // sm | md | lg
  allowCustom={true}                       // Permet de coller emoji custom
/>
```

**Features:**
- ✅ Grid responsive (6-8 colonnes selon le nombre)
- ✅ Custom emoji via input
- ✅ Backdrop click to close
- ✅ Highlight de l'emoji actuel
- ✅ 3 tailles (sm, md, lg)

---

### 2. **DraggableItem** - Item drag & drop générique

```tsx
import { DraggableItem } from '@/components/shared'
import { DndContext, SortableContext } from '@dnd-kit/core'

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={items.map(i => i.id)}>
    {items.map(item => (
      <DraggableItem
        key={item.id}
        id={item.id}
        icon="🔥"
        title={item.name}
        subtitle="Additional info"
        enabled={item.enabled}
        showToggle={true}
        onToggle={(id) => toggleItem(id)}
        onEdit={(id) => editItem(id)}
        onDelete={(id) => deleteItem(id)}
        onDuplicate={(id) => duplicateItem(id)}
      />
    ))}
  </SortableContext>
</DndContext>
```

**Features:**
- ✅ Drag handle avec GripVertical
- ✅ Toggle checkbox (optional)
- ✅ Actions au hover (Edit, Delete, Duplicate, Preview)
- ✅ Custom content support
- ✅ Enabled/disabled states
- ✅ Responsive truncate

---

### 3. **QuickEditPanel** - Panel d'édition rapide (style Notion)

```tsx
import { QuickEditPanel } from '@/components/shared'

<QuickEditPanel
  isOpen={showPanel}
  title="Edit Fact"
  icon="🔥"
  position="right"              // right | bottom
  width="500px"
  onClose={() => setShowPanel(false)}
  onSave={handleSave}
  onDelete={handleDelete}
  saveLabel="Save Changes"
  deleteLabel="Delete"
>
  {/* Your edit form here */}
  <Input value={name} onChange={...} />
  <Textarea value={content} onChange={...} />
</QuickEditPanel>
```

**Features:**
- ✅ Slide from right or bottom
- ✅ Backdrop blur
- ✅ Close on ESC or outside click
- ✅ Save/Delete actions
- ✅ Scroll content overflow
- ✅ Smooth animations

---

### 4. **CategoryPanel** - Gestion des catégories

```tsx
import { CategoryPanel } from '@/components/shared'

const [categories, setCategories] = useState([
  { value: 'auth', label: 'Authentication', icon: '🔐', color: 'blue' },
  { value: 'api', label: 'API Security', icon: '🔌', color: 'green' }
])

<CategoryPanel
  categories={categories}
  onSave={(newCategories) => {
    setCategories(newCategories)
    localStorage.setItem('my_categories', JSON.stringify(newCategories))
  }}
  onCancel={() => setShowPanel(false)}
  title="Manage Categories"
  emojis={['🔐', '🔌', '🧠', '📢']}      // Optional
  colors={['blue', 'green', 'purple']}   // Optional
/>
```

**Features:**
- ✅ Drag & drop pour réorganiser
- ✅ Add/Edit/Delete catégories
- ✅ Emoji picker intégré
- ✅ Color picker
- ✅ Validation (label required)
- ✅ Toast notifications

---

## 🎯 Exemples d'utilisation

### **Memory Facts** - Drag & drop des facts

```tsx
import { DraggableItem, QuickEditPanel } from '@/components/shared'

function FactsMemory({ projectId }) {
  const [facts, setFacts] = useState([])
  const [editingFact, setEditingFact] = useState(null)

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={facts.map(f => f.id)}>
          {facts.map(fact => (
            <DraggableItem
              key={fact.id}
              id={fact.id}
              icon={fact.icon || '📌'}
              title={fact.title}
              subtitle={`${fact.category} • ${fact.tags?.join(', ')}`}
              onEdit={() => setEditingFact(fact)}
              onDelete={() => deleteFact(fact.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <QuickEditPanel
        isOpen={!!editingFact}
        title="Edit Fact"
        icon={editingFact?.icon}
        onClose={() => setEditingFact(null)}
        onSave={handleSave}
      >
        {/* Form fields */}
      </QuickEditPanel>
    </>
  )
}
```

---

### **Rules** - Déjà intégré avec CategoryPanel

```tsx
import { CategoryPanel } from '@/components/shared'

// Le CategoryManager actuel utilise déjà cette architecture
<CategoryPanel
  categories={categories}
  onSave={handleSaveCategories}
  onCancel={() => setShowManager(false)}
/>
```

---

### **System Prompts** - Migration simple

```tsx
import { DraggableItem } from '@/components/shared'

// Remplacer le SortablePrompt actuel par:
<DraggableItem
  id={prompt.id}
  icon="✨"
  title={prompt.name}
  enabled={prompt.enabled}
  showToggle={true}
  onToggle={togglePrompt}
  onEdit={editPrompt}
  onDelete={deletePrompt}
  customContent={
    <div>
      <div className="font-medium">{prompt.name}</div>
      <div className="text-xs text-gray-500">
        {prompt.category} • Priority: {prompt.priority}
      </div>
    </div>
  }
/>
```

---

## 🎨 Style Guidelines

**Colors:**
- Blue: Primary actions
- Green: Success/Save
- Red: Delete/Danger
- Gray: Neutral/Disabled

**Spacing:**
- gap-2: Entre boutons (8px)
- gap-3: Entre items (12px)
- p-3: Padding items (12px)
- p-6: Padding panels (24px)

**Borders:**
- rounded-lg: Items (8px)
- rounded-xl: Panels (12px)
- border-gray-200 dark:border-gray-700

**Animations:**
- transition-all: Smooth transitions
- hover:scale-110: Buttons hover
- opacity-0 group-hover:opacity-100: Actions reveal

---

## 📋 Architecture

```
components/shared/
├── EmojiPicker.tsx       ← Standalone emoji picker
├── DraggableItem.tsx     ← Generic draggable item
├── QuickEditPanel.tsx    ← Slide-in edit panel
├── CategoryPanel.tsx     ← Category manager (uses EmojiPicker)
├── index.ts              ← Barrel exports
└── README.md             ← Cette doc
```

**Dependencies:**
- `@dnd-kit/core` - Drag & drop
- `@dnd-kit/sortable` - Sortable lists
- `lucide-react` - Icons
- `sonner` - Toast notifications

---

## ✅ Checklist Migration

Pour migrer un composant vers le système unifié:

1. **Import composants shared**
   ```tsx
   import { DraggableItem, QuickEditPanel } from '@/components/shared'
   ```

2. **Setup DndContext**
   ```tsx
   const [items, setItems] = useState([])
   const handleDragEnd = (event) => {
     const { active, over } = event
     // arrayMove logic
   }
   ```

3. **Remplacer items custom par DraggableItem**
   - Supprimer code drag & drop custom
   - Utiliser props standardisées

4. **Ajouter QuickEditPanel pour édition**
   - Remplacer modals custom
   - Utiliser position right/bottom

5. **Utiliser CategoryPanel si catégories**
   - Remplacer gestion catégories custom
   - localStorage persistence automatique

---

## 🚀 Next Steps

1. ✅ Composants génériques créés
2. ⏳ Intégrer dans Memory Facts (drag & drop facts)
3. ⏳ Migrer System Prompts vers DraggableItem
4. ⏳ Unifier le style visuel partout
5. ⏳ Documentation utilisateur finale

---

**💡 Tips:**
- Tous les composants supportent dark mode
- Utilisez `customContent` pour layouts spéciaux
- Les callbacks sont optionnels (masque les boutons si undefined)
- Position sticky pour headers (scroll content only)
