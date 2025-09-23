import React from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, Folder, Edit, Trash, Plus } from 'lucide-react'

interface MemoryAction {
  operation: 'create' | 'update' | 'append' | 'delete'
  data: {
    name?: string
    type?: 'document' | 'folder'
    content?: string
    parent_name?: string
    path?: string
    new_name?: string
  }
}

interface MemoryActionConfirmProps {
  action: MemoryAction | null
  onConfirm: () => void
  onCancel: () => void
}

export function MemoryActionConfirm({ action, onConfirm, onCancel }: MemoryActionConfirmProps) {
  if (!action) return null

  const getIcon = () => {
    switch (action.operation) {
      case 'create':
        return action.data.type === 'folder' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />
      case 'update':
      case 'append':
        return <Edit className="w-5 h-5" />
      case 'delete':
        return <Trash className="w-5 h-5" />
      default:
        return <Plus className="w-5 h-5" />
    }
  }

  const getTitle = () => {
    switch (action.operation) {
      case 'create':
        return `Créer ${action.data.type === 'folder' ? 'un dossier' : 'un document'}`
      case 'update':
        return 'Mettre à jour un document'
      case 'append':
        return 'Ajouter du contenu'
      case 'delete':
        return 'Supprimer un élément'
      default:
        return 'Action mémoire'
    }
  }

  const getDescription = () => {
    const { data } = action
    let desc = ''

    switch (action.operation) {
      case 'create':
        desc = `Claude veut créer "${data.name || 'Sans nom'}" `
        if (data.parent_name) desc += `dans le dossier "${data.parent_name}"`
        else if (data.path) desc += `dans le chemin "${data.path}"`
        else desc += 'à la racine'
        break

      case 'update':
        desc = `Claude veut mettre à jour "${data.name || 'Document'}" `
        if (data.new_name) desc += `et le renommer en "${data.new_name}"`
        break

      case 'append':
        desc = `Claude veut ajouter du contenu à "${data.name || 'Document'}"`
        break

      case 'delete':
        desc = `Claude veut supprimer "${data.name || 'Élément'}"`
        break
    }

    return desc
  }

  const getContentPreview = () => {
    if (!action.data.content) return null

    // Limit preview to first 200 chars
    const preview = action.data.content.substring(0, 200)
    const hasMore = action.data.content.length > 200

    return (
      <div className="mt-3 p-3 bg-[#F7F7F8] rounded-md">
        <p className="text-xs text-[#6E6E80] mb-1 font-medium">Aperçu du contenu :</p>
        <pre className="text-xs text-[#202123] whitespace-pre-wrap font-mono">
          {preview}{hasMore ? '...' : ''}
        </pre>
      </div>
    )
  }

  return (
    <AlertDialog open={!!action}>
      <AlertDialogContent className="bg-white border-[#202123]/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[#202123]">
            {getIcon()}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#6E6E80]">
            {getDescription()}
            {getContentPreview()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-[#F7F7F8] hover:bg-[#6E6E80]/20 text-[#202123] border-[#202123]/20"
          >
            Refuser
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[#202123] hover:bg-[#202123]/80 text-white"
          >
            Autoriser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}