'use client'

import { useEffect, useState } from 'react'
import { getAllTransactions } from '@/lib/transactions'

interface MonthData {
  label: string
  year: number
  month: number
  income: number
  expense: number
}

function fmt(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`
  if (n >= 1_000) return `${Math.round(n / 1_000)}천`
  return `${n}`
}

export default function MonthlyTrendChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTransactions()
      .then(txs => {
        const map = new Map<string, { income: number; expense: number; year: number; month: number }>()
        txs
          .filter(t => !t.is_excluded && !t.is_hidden)
          .forEach(t => {
            const [y, m] = t.date.split('-').map(Number)
            const key = `${y}-${String(m).padStart(2, '0')}`
            if (!map.has(key)) map.set(key, { income: 0, expense: 0, year: y, month: m })
            const e = map.get(key)!
            if (t.type === 'income') e.income += t.amount
            else e.expense += t.amount
          })

        const sorted = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([, d]) => ({
            label: `${d.month}월`,
            year: d.year,
            month: d.month,
            income: d.income,
            expense: d.expense,
          }))

        setData(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="glass rounded-2xl h-44 shimmer" />
  if (data.length === 0) return null

  const totalIncome = data.reduce((s, d) => s + d.income, 0)
  const totalExpense = data.reduce((s, d) => s + d.expense, 0)
  const net = totalIncome - totalExpense

  const N = data.length
  const CHART_H = 110
  const BAR_W = 14
  const BAR_GAP = 5
  const GROUP_W = 44
  const SVG_W = N * GROUP_W + 8

  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)

  return (
    <div className="glass rounded-2xl px-4 pt-4 pb-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>월별 수입 · 지출</span>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg,#22d3ee,#0891b2)' }} />
            수입
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg,#fb7185,#e11d48)' }} />
            지출
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${CHART_H + 22}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
      >
        <defs>
          <linearGradient id="trendIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="trendExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.75" />
          </linearGradient>
          <filter id="trendGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* baseline */}
        <line x1="4" y1={CHART_H} x2={SVG_W - 4} y2={CHART_H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {data.map((d, i) => {
          const cx = i * GROUP_W + GROUP_W / 2 + 4
          const incH = Math.max((d.income / max) * CHART_H, d.income > 0 ? 3 : 0)
          const expH = Math.max((d.expense / max) * CHART_H, d.expense > 0 ? 3 : 0)
          const incX = cx - BAR_W - BAR_GAP / 2
          const expX = cx + BAR_GAP / 2

          return (
            <g key={i}>
              {/* income bar */}
              {d.income > 0 && (
                <rect
                  x={incX}
                  y={CHART_H - incH}
                  width={BAR_W}
                  height={incH}
                  rx={3}
                  fill="url(#trendIncome)"
                  filter="url(#trendGlow)"
                  opacity={0.9}
                />
              )}
              {/* expense bar */}
              {d.expense > 0 && (
                <rect
                  x={expX}
                  y={CHART_H - expH}
                  width={BAR_W}
                  height={expH}
                  rx={3}
                  fill="url(#trendExpense)"
                  filter="url(#trendGlow)"
                  opacity={0.9}
                />
              )}
              {/* month label */}
              <text
                x={cx}
                y={CHART_H + 14}
                textAnchor="middle"
                fontSize="9.5"
                fill="rgba(255,255,255,0.45)"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Summary row */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="space-y-0.5">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>기간 합계</p>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span style={{ color: '#22d3ee' }}>+{fmt(totalIncome)}</span>
            <span style={{ color: '#fb7185' }}>-{fmt(totalExpense)}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>순 잔액</p>
          <p
            className="text-sm font-bold"
            style={{ color: net >= 0 ? '#34d399' : '#fb7185' }}
          >
            {net >= 0 ? '+' : ''}{fmt(net)}
          </p>
        </div>
      </div>
    </div>
  )
}
