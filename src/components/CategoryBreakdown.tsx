'use client'

import { Transaction } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { getCategoryComment } from '@/lib/insights'

interface Props {
  transactions: Transaction[]
  prevTransactions: Transaction[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍽', 카페: '☕', 편의점: '🏪', 교통: '🚌', 쇼핑: '🛍', 구독: '📱',
  주거: '🏠', 의료: '💊', 문화: '🎬', 교육: '📚', 급여: '💰', 투자: '📈',
  부업: '💼', 기타: '📦',
}

export default function CategoryBreakdown({ transactions, prevTransactions }: Props) {
  const expenses     = transactions.filter(t => t.type === 'expense')
  const prevExpenses = prevTransactions.filter(t => t.type === 'expense')
  const total        = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = expenses.reduce<Record<string, { amount: number; count: number }>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = { amount: 0, count: 0 }
    acc[t.category].amount += t.amount
    acc[t.category].count  += 1
    return acc
  }, {})

  const prevByCategory = prevExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].amount - a[1].amount)

  if (sorted.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>지출 내역이 없어요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Total summary */}
      <div className="glass rounded-2xl px-5 py-4 glow-rose relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #fb7185, transparent)' }} />
        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>이번 달 총 지출</p>
        <p className="text-2xl font-bold text-rose-300 text-glow-rose">{total.toLocaleString('ko-KR')}원</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {sorted.length}개 카테고리 · {expenses.length}건
        </p>
      </div>

      {/* Category cards */}
      {sorted.map(([category, { amount, count }], idx) => {
        const pct       = total > 0 ? (amount / total) * 100 : 0
        const prevAmt   = prevByCategory[category]
        const changePct = prevAmt ? ((amount - prevAmt) / prevAmt) * 100 : null
        const color     = getCategoryColor(category)
        const comment   = getCategoryComment(category, pct, changePct)
        const isTop     = idx === 0

        return (
          <div key={category} className={`glass rounded-2xl px-4 py-4 transition-all ${isTop ? 'glow-rose' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${color.bg} shrink-0`}>
                  {CATEGORY_EMOJI[category] ?? '📦'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{category}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count}건</span>
                    {isTop && (
                      <span className="text-xs bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full font-semibold">최다</span>
                    )}
                  </div>
                  {comment && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{comment}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-bold text-white">{amount.toLocaleString('ko-KR')}원</p>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                  {changePct !== null && (
                    <span className={`text-xs font-semibold ${changePct > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {changePct > 0 ? '▲' : '▼'}{Math.abs(changePct).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color.dot}, ${color.dot}99)`,
                  boxShadow: `0 0 8px ${color.dot}60`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
