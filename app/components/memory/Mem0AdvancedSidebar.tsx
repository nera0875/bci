'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { MemoryServiceV5, type MemoryCategory, type Subcategory } from '@/lib/services/memoryServiceV5';
import { motion, AnimatePresence } from 'framer-motion';

interface Mem0AdvancedSidebarProps {
  projectId: string;
}

export default function Mem0AdvancedSidebar({ projectId }: Mem0AdvancedSidebarProps) {
  const [categories, setCategories] = useState<MemoryCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Initialize service
  useEffect(() => {
    const service = new MemoryServiceV5({
      apiKey: process.env.NEXT_PUBLIC_MEM0_API_KEY || '',
      projectId,
      userId: 'system',
      plan: 'STARTER'
    });

    // Load categories
    const loadedCategories = service.getCategories();
    setCategories(loadedCategories);
    setLoading(false);

    // Load stats
    loadStats();
  }, [projectId]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/memory/v5/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveSubcategory(null);
  };

  const handleSubcategoryClick = (categoryId: string, subcategoryId: string) => {
    setActiveCategory(categoryId);
    setActiveSubcategory(subcategoryId);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.Folder;
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Folder;
  };

  const handleAddMemory = async () => {
    setShowAddModal(true);
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Mem0 Memory</h2>
          <button
            onClick={handleAddMemory}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icons.Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Active Tags */}
        {selectedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-900 text-white rounded-full"
              >
                {tag}
                <button
                  onClick={() => setSelectedTags(tags => tags.filter(t => t !== tag))}
                  className="hover:bg-gray-700 rounded-full"
                >
                  <Icons.X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map(category => {
              const Icon = getIcon(category.icon);
              const isExpanded = expandedCategories.has(category.id);
              const isActive = activeCategory === category.id && !activeSubcategory;
              const categoryStats = stats[category.id] || 0;

              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => {
                      handleCategoryClick(category.id);
                      toggleCategory(category.id);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-white hover:shadow-sm text-gray-700'
                    }`}
                  >
                    <Icons.ChevronRight
                      className={`w-3 h-3 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      } ${isActive ? 'text-white' : 'text-gray-400'}`}
                    />
                    <Icon className={`w-4 h-4 ${category.color}`} />
                    <span className="flex-1 text-left text-sm font-medium truncate">
                      {category.name}
                    </span>
                    {categoryStats > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {categoryStats}
                      </span>
                    )}
                  </button>

                  {/* Subcategories */}
                  <AnimatePresence>
                    {isExpanded && category.subcategories && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-5 mt-1 space-y-0.5 overflow-hidden"
                      >
                        {category.subcategories.map(subcategory => {
                          const SubIcon = getIcon(subcategory.icon);
                          const isSubActive = activeSubcategory === subcategory.id;
                          const subStats = stats[`${category.id}.${subcategory.id}`] || 0;

                          return (
                            <button
                              key={subcategory.id}
                              onClick={() => handleSubcategoryClick(category.id, subcategory.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
                                isSubActive
                                  ? 'bg-gray-800 text-white'
                                  : 'hover:bg-gray-100 text-gray-600'
                              }`}
                            >
                              <SubIcon className={`w-3.5 h-3.5 ${subcategory.color || 'text-gray-400'}`} />
                              <span className="flex-1 text-left text-xs truncate">
                                {subcategory.name}
                              </span>
                              {subStats > 0 && (
                                <span className={`text-xs px-1 py-0.5 rounded-full ${
                                  isSubActive
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {subStats}
                                </span>
                              )}
                              {subcategory.tags && subcategory.tags.length > 0 && (
                                <Icons.Tag className="w-3 h-3 opacity-50" />
                              )}
                            </button>
                          );
                        })}

                        {/* Add Subcategory Button */}
                        <button
                          onClick={() => console.log('Add subcategory to', category.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 border-2 border-dashed border-gray-200"
                        >
                          <Icons.Plus className="w-3 h-3" />
                          <span className="text-xs">Add subcategory</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Add Category Button */}
            <button
              onClick={() => console.log('Add new category')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 border-2 border-dashed border-gray-300 mt-2"
            >
              <Icons.Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Category</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer - Quick Actions */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>STARTER Plan</span>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="p-1 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <Icons.RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 hover:bg-gray-100 rounded"
              title="Settings"
            >
              <Icons.Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddModal && (
          <MemoryAddModal
            categories={categories}
            onClose={() => setShowAddModal(false)}
            onAdd={async (data) => {
              // Add memory via API
              const response = await fetch('/api/memory/v5/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, ...data })
              });

              if (response.ok) {
                loadStats();
                setShowAddModal(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal Component for adding memories
function MemoryAddModal({
  categories,
  onClose,
  onAdd
}: {
  categories: MemoryCategory[];
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    await onAdd({
      content,
      metadata: {
        category: selectedCategory,
        subcategory: selectedSubcategory,
        tags,
        priority,
        ...customFields
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Add Memory</h2>

          {/* Category Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                disabled={!selectedCategory}
              >
                <option value="">Select subcategory</option>
                {selectedCategory && categories
                  .find(c => c.id === selectedCategory)?.subcategories
                  ?.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              rows={4}
              placeholder="Enter memory content..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              placeholder="Enter tags separated by commas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  const newTags = input.value.split(',').map(t => t.trim()).filter(Boolean);
                  setTags([...tags, ...newTags]);
                  input.value = '';
                }
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="hover:bg-gray-200 rounded-full"
                  >
                    <Icons.X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    priority === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Memory
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}