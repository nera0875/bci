'use client'

import { useState, useEffect } from 'react'
import { Shield, Zap, Database, Globe, Code, Bug, Key, Lock, AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface RulesSimpleProps {
  projectId: string
}

// Simplified rules - just ON/OFF for focus areas
const RULE_CATEGORIES = [
  {
    category: 'Vulnerabilities',
    icon: Shield,
    color: 'text-red-500',
    rules: [
      { id: 'sqli', name: 'SQL Injection', description: 'Focus on SQL injection patterns' },
      { id: 'xss', name: 'XSS', description: 'Detect cross-site scripting' },
      { id: 'idor', name: 'IDOR', description: 'Find insecure direct object references' },
      { id: 'nosql', name: 'NoSQL Injection', description: 'Test NoSQL databases' },
      { id: 'jwt', name: 'JWT Issues', description: 'Check JWT implementation' },
      { id: 'ssrf', name: 'SSRF', description: 'Server-side request forgery' }
    ]
  },
  {
    category: 'Authentication',
    icon: Key,
    color: 'text-blue-500',
    rules: [
      { id: 'auth_bypass', name: 'Auth Bypass', description: 'Test authentication bypasses' },
      { id: 'session', name: 'Session Issues', description: 'Session management problems' },
      { id: 'password', name: 'Weak Passwords', description: 'Brute force & weak passwords' },
      { id: 'mfa', name: 'MFA Bypass', description: 'Multi-factor authentication issues' }
    ]
  },
  {
    category: 'Business Logic',
    icon: Zap,
    color: 'text-yellow-500',
    rules: [
      { id: 'race', name: 'Race Conditions', description: 'Concurrent request issues' },
      { id: 'price', name: 'Price Manipulation', description: 'Payment & pricing issues' },
      { id: 'privilege', name: 'Privilege Escalation', description: 'Access control problems' },
      { id: 'workflow', name: 'Workflow Bypass', description: 'Business flow issues' }
    ]
  },
  {
    category: 'Information',
    icon: Database,
    color: 'text-green-500',
    rules: [
      { id: 'disclosure', name: 'Info Disclosure', description: 'Sensitive data exposure' },
      { id: 'error', name: 'Error Messages', description: 'Verbose error information' },
      { id: 'headers', name: 'Headers Leakage', description: 'Security headers missing' },
      { id: 'backup', name: 'Backup Files', description: 'Exposed backup files' }
    ]
  }
]

export default function RulesSimple({ projectId }: RulesSimpleProps) {
  const [enabledRules, setEnabledRules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      const { data } = await supabase
        .from('rules')
        .select('focus_type, enabled')
        .eq('project_id', projectId)

      if (data) {
        const enabled = new Set(
          data.filter(r => r.enabled).map(r => r.focus_type)
        )
        setEnabledRules(enabled)
      } else {
        // Default enabled rules
        setEnabledRules(new Set(['sqli', 'xss', 'idor', 'auth_bypass']))
      }
    } catch (error) {
      console.error('Error loading rules:', error)
      // Set defaults on error
      setEnabledRules(new Set(['sqli', 'xss', 'idor', 'auth_bypass']))
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (ruleId: string) => {
    const newEnabled = new Set(enabledRules)
    const isNowEnabled = !enabledRules.has(ruleId)

    if (isNowEnabled) {
      newEnabled.add(ruleId)
    } else {
      newEnabled.delete(ruleId)
    }

    setEnabledRules(newEnabled)

    // Find rule details
    const rule = RULE_CATEGORIES
      .flatMap(c => c.rules)
      .find(r => r.id === ruleId)

    if (!rule) return

    try {
      // Check if rule exists
      const { data: existing } = await supabase
        .from('rules')
        .select('id')
        .eq('project_id', projectId)
        .eq('focus_type', ruleId)
        .single()

      if (existing) {
        // Update existing
        await supabase
          .from('rules')
          .update({ enabled: isNowEnabled })
          .eq('id', existing.id)
      } else {
        // Create new
        await supabase
          .from('rules')
          .insert({
            project_id: projectId,
            name: rule.name,
            focus_type: ruleId,
            enabled: isNowEnabled
          })
      }

      toast.success(
        isNowEnabled
          ? `${rule.name} activated - AI will focus on this`
          : `${rule.name} deactivated`
      )
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Failed to update rule')
      // Revert on error
      setEnabledRules(enabledRules)
    }
  }

  const getActiveCount = () => {
    return enabledRules.size
  }

  const getTotalCount = () => {
    return RULE_CATEGORIES.reduce((acc, cat) => acc + cat.rules.length, 0)
  }

  return (
    <div className="h-full flex flex-col bg-[#F7F7F8] dark:bg-[#0D0D0D]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="text-gray-600 dark:text-gray-400" size={24} />
              AI Focus Rules
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Toggle what the AI should focus on during analysis
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {getActiveCount()} / {getTotalCount()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active rules</p>
          </div>
        </div>

        {/* Quick Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              RULE_CATEGORIES.forEach(cat =>
                cat.rules.forEach(rule => toggleRule(rule.id))
              )
            }}
            className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Enable All
          </button>
          <button
            onClick={() => setEnabledRules(new Set())}
            className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            Disable All
          </button>
          <button
            onClick={() => {
              const defaults = ['sqli', 'xss', 'idor', 'auth_bypass']
              setEnabledRules(new Set(defaults))
            }}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading rules...</div>
          </div>
        ) : (
          <div className="grid gap-6">
            {RULE_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  {/* Category Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('size-5', category.color)} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.category}
                      </h3>
                      <span className="ml-auto text-sm text-gray-500">
                        {category.rules.filter(r => enabledRules.has(r.id)).length} / {category.rules.length} active
                      </span>
                    </div>
                  </div>

                  {/* Rules List */}
                  <div className="p-4 space-y-3">
                    {category.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg transition-all",
                          enabledRules.has(rule.id)
                            ? "bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              enabledRules.has(rule.id)
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400"
                            )}>
                              {rule.name}
                            </span>
                            {enabledRules.has(rule.id) && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {rule.description}
                          </p>
                        </div>
                        <Switch
                          checked={enabledRules.has(rule.id)}
                          onCheckedChange={() => toggleRule(rule.id)}
                          className="ml-4"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-blue-600 dark:text-blue-400 size-4 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">How it works:</p>
            <p className="text-xs mt-1">
              When you enable a rule, the AI will prioritize looking for that type of vulnerability.
              It will analyze patterns, suggest tests, and automatically organize findings in Memory.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}