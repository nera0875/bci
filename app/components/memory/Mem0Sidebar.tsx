'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { compartmentsConfig } from '@/lib/config/compartments.config';

// Mapper dynamiquement les icônes
const getIcon = (iconName: string) => {
  const IconComponent = Icons[iconName as keyof typeof Icons] as any;
  return IconComponent || Icons.Folder;
};

export default function Mem0Sidebar({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState<string[]>(['success_exploits']);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const toggleCompartment = (id: string) => {
    setExpanded(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: 'system'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCounts(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch Mem0 stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always try to fetch counts - the API will handle auth validation
    fetchCounts();
  }, [projectId]);

  return (
    <div className="bg-[#F7F7F8] border-r border-gray-200 p-4 h-full">
      <div className="mb-4">
        <h3 className="text-xs font-medium text-[#6E6E80] uppercase tracking-wider mb-2">
          Mem0 Compartments
        </h3>
        {loading && (
          <div className="text-xs text-[#6E6E80]">Loading...</div>
        )}
      </div>

      <div className="space-y-1">
        {compartmentsConfig.map(comp => {
          const Icon = getIcon(comp.icon);
          const isExpanded = expanded.includes(comp.id);
          const count = counts[comp.id] || 0;

          return (
            <div key={comp.id}>
              <button
                onClick={() => toggleCompartment(comp.id)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-white hover:shadow-sm transition-all group"
              >
                {isExpanded ? (
                  <Icons.ChevronDown className="w-3 h-3 text-[#6E6E80]" />
                ) : (
                  <Icons.ChevronRight className="w-3 h-3 text-[#6E6E80]" />
                )}
                <Icon className={`w-4 h-4 ${comp.color}`} />
                <span className="flex-1 text-left text-sm text-[#202123]">
                  {comp.name}
                </span>
                <span className="text-xs text-[#6E6E80] bg-white px-2 py-0.5 rounded border border-gray-200">
                  {count}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-7 pl-2 border-l border-gray-200">
                  <p className="text-xs text-[#6E6E80] py-1">
                    {comp.description}
                  </p>
                  {count === 0 ? (
                    <p className="text-xs text-[#6E6E80] italic py-2">
                      No memories yet
                    </p>
                  ) : (
                    <p className="text-xs text-[#6E6E80] py-2">
                      Click to view in main panel
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-[#6E6E80]">
          <div className="flex items-center justify-between mb-1">
            <span>API Status:</span>
            <span className="text-green-500">● Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Project ID:</span>
            <span className="text-[#6E6E80] truncate max-w-[150px]" title={projectId}>
              {projectId.slice(0, 12)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}