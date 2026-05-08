'use client'

import { Insight } from '@/lib/insights'

const STYLES = {
  info: {
    border: 'border-cyan-500/20',
    bgStyle: 'rgba(6,182,212,0.07)',
    badge: 'bg-cyan-500/15 text-cyan-400',
    text: 'text-cyan-100/85',
    label: 'INFO',
  },
  warning: {
    border: 'border-rose-500/25',
    bgStyle: 'rgba(244,63,94,0.09)',
    badge: 'bg-rose-500/15 text-rose-400',
    text: 'text-rose-100/85',
    label: '소비 위험',
  },
  tip: {
    border: 'border-emerald-500/20',
    bgStyle: 'rgba(16,185,129,0.07)',
    badge: 'bg-emerald-500/15 text-emerald-400',
    text: 'text-emerald-100/85',
    label: 'TIP',
  },
  psychology: {
    border: 'border-indigo-500/20',
    bgStyle: 'rgba(99,102,241,0.07)',
    badge: 'bg-indigo-500/15 text-indigo-300',
    text: 'text-indigo-100/85',
    label: 'AI',
  },
}

export default function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null

  const warnings = insights.filter(i => i.type === 'warning')
  const others   = insights.filter(i => i.type !== 'warning')

  return (
    <div className="space-y-2.5">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          AI 인사이트
        </p>
        <span className="ai-badge text-xs px-1.5 py-0.5 rounded-full text-indigo-300 font-semibold ml-auto">
          {insights.length}개
        </span>
      </div>

      {/* Risk alerts */}
      {warnings.map((insight, i) => {
        const s = STYLES.warning
        return (
          <div
            key={`w${i}`}
            className={`rounded-2xl px-4 py-3.5 border ${s.border} relative overflow-hidden`}
            style={{ background: s.bgStyle }}
          >
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-sm ${s.badge}`}>
                {insight.emoji}
              </div>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md mb-1.5 inline-block ${s.badge}`}>
                  {s.label}
                </span>
                <p className={`text-sm leading-snug ${s.text}`}>{insight.text}</p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Other insights */}
      {others.map((insight, i) => {
        const s = STYLES[insight.type]
        return (
          <div
            key={`o${i}`}
            className={`glass rounded-xl px-4 py-3 border ${s.border} flex items-start gap-3`}
          >
            <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs ${s.badge}`}>
              {insight.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-1.5 ${s.badge}`}>
                {s.label}
              </span>
              <p className={`text-sm leading-snug mt-1 ${s.text}`}>{insight.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
