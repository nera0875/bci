'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Search } from 'lucide-react'
import FactsMemoryViewPro from '@/components/memory/FactsMemoryViewPro'
import PatternsPanel from './intelligence/PatternsPanel'

interface MemorySectionProps {
  projectId: string
}

export default function MemorySectionNew({ projectId }: MemorySectionProps) {
  const [activeTab, setActiveTab] = useState('facts')

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs navigation */}
        <div className="px-6 pt-6 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Memory & Knowledge</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Facts, patterns, and learned knowledge</p>
          </div>
          <TabsList className="grid w-full max-w-2xl grid-cols-2 shadow-sm">
            <TabsTrigger value="facts" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <FileText size={16} />
              Facts
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <Search size={16} />
              Patterns
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="facts" className="h-full m-0 p-0">
            <FactsMemoryViewPro projectId={projectId} />
          </TabsContent>

          <TabsContent value="patterns" className="h-full m-0 p-0">
            <PatternsPanel projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
