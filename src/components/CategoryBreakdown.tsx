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
  const expenses = transactions.filter(t => t.type === 'expense')
  const prevExpenses = prevTransactions.filter(t => t.type === 'expense')
  const total = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = expenses.reduce<Record<string, { amount: number; count: number }>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = { amount: 0, count: 0 }
    acc[t.category].amount += t.amount
    acc[t.category].count += 1
    return acc
  }, {})

  const prevByCategory = prevExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].amount - a[1].amount)

  if (sorted.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">지출 내역이 없어요</div>
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">이번 달 총 지출</p>
        <p className="text-2xl font-bold text-gray-900">{total.toLocaleString('ko-KR')}원</p>
        <p className="text-xs text-gray-400 mt-1">{sorted.length}개 카테고리</p>
      </div>

      {sorted.map(([category, { amount, count }]) => {
        const pct = total > 0 ? (amount / total) * 100 : 0
        const prevAmt = prevByCategory[category]
        const changePct = prevAmt ? ((amount - prevAmt) / prevAmt) * 100 : null
        const color = getCategoryColor(category)
        const comment = getCategoryComment(category, pct, changePct)

        return (
          <div key={category} className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{CATEGORY_EMOJI[category] ?? '📦'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-800">{category}</span>
                    <span className="text-xs text-gray-400">{count}건</span>
                  </div>
                  {comment && <p className="text-xs text-gray-500 mt-0.5">{comment}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-bold text-gray-900">{amount.toLocaleString('ko-KR')}원</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  {changePct !== null && (
                    <span className={`text-xs font-medium ${changePct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {changePct > 0 ? '▲' : '▼'}{Math.abs(changePct).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color.dot }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
