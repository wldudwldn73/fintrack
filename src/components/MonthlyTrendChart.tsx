'use client'

import { useEffect, useState } from 'react'
import { getAllTransactions } from '@/lib/transactions'

interface CatRow {
  category: string
  amount: number
  count: number
}

interface Summary {
  income: CatRow[]
  expense: CatRow[]
  totalIncome: number
  totalExpense: number
}

const CAT_COLORS: Record<string, string> = {
  급여: '#818cf8', 부업: '#a78bfa', 투자: '#34d399', 적금: '#6ee7b7', 지원: '#67e8f9', 기타수입: '#93c5fd',
  식비: '#f87171', 카페: '#fb923c', 편의점: '#fbbf24', 교통: '#facc15',
  쇼핑: '#a3e635', 구독: '#4ade80', 주거: '#2dd4bf', 의료: '#38bdf8',
  문화: '#818cf8', 교육: '#c084fc', 보험: '#f472b6', 기타: '#94a3b8',
}

function catColor(cat: string) {
  return CAT_COLORS[cat] ?? '#94a3b8'
}

function fmtAmount(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}천만원`
  if (n >= 10_000) return `${Math.round(n / 10_000)}만원`
  return `${n.toLocaleString()}원`
}

export default function MonthlyTrendChart() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTransactions()
      .then(txs => {
        const filtered = txs.filter(t => !t.is_excluded && !t.is_hidden)
        const incMap = new Map<string, { amount: number; count: number }>()
        const expMap = new Map<string, { amount: number; count: number }>()

        filtered.forEach(t => {
          const map = t.type === 'income' ? incMap : expMap
          const cat = t.category || '기타'
          const prev = map.get(cat) ?? { amount: 0, count: 0 }
          map.set(cat, { amount: prev.amount + t.amount, count: prev.count + 1 })
        })

        const toRows = (m: Map<string, { amount: number; count: number }>): CatRow[] =>
          Array.from(m.entries())
            .map(([category, { amount, count }]) => ({ category, amount, count }))
            .sort((a, b) => b.amount - a.amount)

        setSummary({
          income: toRows(incMap),
          expense: toRows(expMap),
          totalIncome: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          totalExpense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="glass rounded-2xl h-52 shimmer" />
  if (!summary) return null

  const rows = tab === 'income' ? summary.income : summary.expense
  const total = tab === 'income' ? summary.totalIncome : summary.totalExpense
  const max = rows[0]?.amount ?? 1
  const net = summary.totalIncome - summary.totalExpense

  return (
    <div className="glass rounded-2xl px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>전체 수입·지출 분석</span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: net >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
            color: net >= 0 ? '#34d399' : '#f87171',
          }}>
          {net >= 0 ? '+' : ''}{fmtAmount(net)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden text-xs font-medium" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setTab('expense')}
          className="flex-1 py-1.5 transition-colors"
          style={{
            background: tab === 'expense' ? 'rgba(248,113,113,0.2)' : 'transparent',
            color: tab === 'expense' ? '#f87171' : 'var(--text-muted)',
          }}
        >
          지출 {fmtAmount(summary.totalExpense)}
        </button>
        <button
          onClick={() => setTab('income')}
          className="flex-1 py-1.5 transition-colors"
          style={{
            background: tab === 'income' ? 'rgba(34,211,238,0.15)' : 'transparent',
            color: tab === 'income' ? '#22d3ee' : 'var(--text-muted)',
          }}
        >
          수입 {fmtAmount(summary.totalIncome)}
        </button>
      </div>

      {/* Category rows */}
      {rows.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>내역 없음</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(row => {
            const pct = (row.amount / max) * 100
            const color = catColor(row.category)
            return (
              <div key={row.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{row.category}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.count}건</span>
                  </div>
                  <span className="font-semibold tabular-nums" style={{ color }}>
                    {fmtAmount(row.amount)}
                  </span>
                </div>
                {/* bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color, opacity: 0.8 }}
                  />
                </div>
                {/* share */}
                <p className="text-right text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
