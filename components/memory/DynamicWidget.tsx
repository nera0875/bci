'use client'

import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react'

interface DynamicWidgetProps {
  content: any
}

export default function DynamicWidget({ content }: DynamicWidgetProps) {
  // Handle different widget types based on content structure
  if (!content || typeof content !== 'object') {
    return null
  }

  // Chart Widget
  if (content.widget_type === 'chart') {
    return (
      <div className="p-3 bg-background rounded-lg border border-border">
        <div className="text-xs font-medium text-foreground mb-2">{content.title || 'Chart'}</div>
        <div className="space-y-1">
          {content.data?.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-muted rounded-full h-1.5">
                  <div
                    className="h-full bg-foreground rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="text-foreground w-10 text-right">{item.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Metric Widget
  if (content.widget_type === 'metric') {
    const trend = content.trend || 'stable'
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

    return (
      <div className="p-3 bg-background rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{content.label}</div>
            <div className="text-lg font-bold text-foreground">{content.value}</div>
          </div>
          <TrendIcon className={`w-4 h-4 ${
            trend === 'up' ? 'text-success' :
            trend === 'down' ? 'text-error' :
            'text-muted-foreground'
          }`} />
        </div>
      </div>
    )
  }

  // Alert Widget
  if (content.widget_type === 'alert') {
    return (
      <div className={`p-3 rounded-lg border ${
        content.severity === 'high' ? 'bg-error/10 border-error' :
        content.severity === 'medium' ? 'bg-warning/10 border-warning' :
        'bg-muted border-border'
      }`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">{content.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{content.message}</div>
          </div>
        </div>
      </div>
    )
  }

  // List Widget
  if (content.widget_type === 'list') {
    return (
      <div className="p-3 bg-background rounded-lg border border-border">
        <div className="text-xs font-medium text-foreground mb-2">{content.title || 'List'}</div>
        <ul className="space-y-1">
          {content.items?.map((item: any, i: number) => (
            <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Progress Widget
  if (content.widget_type === 'progress') {
    const percentage = content.value || 0
    return (
      <div className="p-3 bg-background rounded-lg border border-border">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-foreground font-medium">{content.label}</span>
          <span className="text-muted-foreground">{percentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all ${
              percentage >= 90 ? 'bg-success' :
              percentage >= 50 ? 'bg-warning' :
              'bg-error'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  // Default: JSON Display
  return (
    <div className="p-3 bg-background rounded-lg border border-border">
      <pre className="text-xs text-muted-foreground overflow-x-auto">
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  )
}