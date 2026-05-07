'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍽', 교통: '🚌', 쇼핑: '🛍', 주거: '🏠',
  의료: '💊', 문화: '🎬', 교육: '📚', 급여: '💰',
  투자: '📈', 기타: '📦',
}

const COLORS = [
  '#1f2937', '#374151', '#4b5563', '#6b7280',
  '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6',
  '#111827', '#6b7280',
]

export default function CategoryBreakdown({ transactions }: Props) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = expenses.reduce<Record<string, { amount: number; count: number }>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = { amount: 0, count: 0 }
    acc[t.category].amount += t.amount
    acc[t.category].count += 1
    return acc
  }, {})

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].amount - a[1].amount)
  const chartData = sorted.map(([name, { amount }]) => ({ name, value: amount }))

  if (sorted.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">지출 내역이 없어요</div>
  }

  return (
    <div className="space-y-4">
      {/* 도넛 차트 */}
      <div className="bg-white rounded-2xl px-4 py-5 shadow-sm">
        <p className="text-xs text-gray-400 mb-1">이번 달 지출</p>
        <p className="text-xl font-bold text-gray-900 mb-4">{totalExpense.toLocaleString('ko-KR')}원</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString('ko-KR')}원`, '']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 범례 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
          {sorted.map(([category], i) => (
            <div key={category} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-gray-600">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 카테고리별 목록 */}
      <div className="space-y-2">
        {sorted.map(([category, { amount, count }], i) => {
          const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
          return (
            <div key={category} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_EMOJI[category] ?? '📦'}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{category}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{count}건</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {amount.toLocaleString('ko-KR')}원
                  </span>
                  <span className="text-xs text-gray-400 ml-1.5">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
