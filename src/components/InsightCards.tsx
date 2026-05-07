'use client'

import { Insight } from '@/lib/insights'

const STYLES = {
  info:       { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-100' },
  warning:    { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-100' },
  tip:        { bg: 'bg-emerald-50',text: 'text-emerald-800',border: 'border-emerald-100' },
  psychology: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-100' },
}

export default function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">AI 인사이트</p>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const s = STYLES[insight.type]
          return (
            <div key={i} className={`rounded-xl px-4 py-3 border ${s.bg} ${s.border} flex items-start gap-3`}>
              <span className="text-base shrink-0 mt-0.5">{insight.emoji}</span>
              <p className={`text-sm leading-snug ${s.text}`}>{insight.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
