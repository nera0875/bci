'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Shield, Target, AlertCircle, Lightbulb, Zap } from 'lucide-react';
// import type { MemoryResult } from '@/lib/services/memoryServiceV4'; // REMOVED

// Type de base pour les mémoires
interface MemoryResult {
  id: string
  content: string
  metadata?: any
  categories?: string[]
  created_at: string
}

interface CompartmentViewProps {
  projectId: string;
  userId: string;
}

const compartmentConfig = {
  success_exploits: {
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-green-500',
    title: 'Successful Exploits',
    description: 'Validated exploits with payloads and bypass methods'
  },
  failed_attempts: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-red-500',
    title: 'Failed Attempts',
    description: 'Blocked attempts with protection analysis'
  },
  reconnaissance: {
    icon: <Target className="w-4 h-4" />,
    color: 'bg-blue-500',
    title: 'Reconnaissance',
    description: 'Collected information: ports, services, technologies'
  },
  active_plans: {
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'bg-yellow-500',
    title: 'Active Plans',
    description: 'Attack plans and next steps'
  },
  patterns: {
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-purple-500',
    title: 'Patterns',
    description: 'Reusable techniques extracted from successes'
  }
};

export function CompartmentView({ projectId, userId }: CompartmentViewProps) {
  const [activeCompartment, setActiveCompartment] = useState('success_exploits');
  const [memories, setMemories] = useState<Record<string, MemoryResult[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  // Fetch compartment stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/memory/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId })
      });
      const data = await response.json();
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch memories for a compartment
  const fetchCompartmentMemories = async (compartment: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory/compartment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          compartment,
          query: searchQuery
        })
      });
      const data = await response.json();
      setMemories(prev => ({
        ...prev,
        [compartment]: data.memories || []
      }));
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search within compartment
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await fetchCompartmentMemories(activeCompartment);
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCompartmentMemories(activeCompartment);
  }, [activeCompartment]);

  return (
    <div className="w-full space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(compartmentConfig).map(([key, config]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${
              activeCompartment === key ? 'ring-2 ring-offset-2' : ''
            }`}
            onClick={() => setActiveCompartment(key)}
          >
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  {config.icon}
                </div>
                <Badge variant="secondary">
                  {stats[key] || 0}
                </Badge>
              </div>
              <CardTitle className="text-sm mt-2">{config.title}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Active Compartment View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {compartmentConfig[activeCompartment].icon}
                {compartmentConfig[activeCompartment].title}
              </CardTitle>
              <CardDescription>
                {compartmentConfig[activeCompartment].description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search in compartment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-64"
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading memories...
              </div>
            ) : (
              <div className="space-y-2">
                {memories[activeCompartment]?.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
                {(!memories[activeCompartment] || memories[activeCompartment].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No memories in this compartment
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function MemoryCard({ memory }: { memory: MemoryResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm ${expanded ? '' : 'line-clamp-2'}`}>
              {memory.memory}
            </p>
            {expanded && memory.metadata && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  {Object.entries(memory.metadata).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium">{key}:</span>
                      <span>{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {memory.score && (
            <Badge variant="outline" className="ml-2">
              {(memory.score * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}