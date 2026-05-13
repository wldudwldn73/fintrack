'use client'

import { useState, useEffect, useRef } from 'react'
import { Transaction } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { getCategoryComment } from '@/lib/insights'
import { type CustomCat } from '@/components/CategoryPicker'

interface Props {
  transactions: Transaction[]
  prevTransactions: Transaction[]
  customCats?: CustomCat[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍽', 카페: '☕', 편의점: '🏪', 교통: '🚌', 쇼핑: '🛍', 구독: '📱',
  주거: '🏠', 의료: '💊', 문화: '🎬', 교육: '📚', 급여: '💰', 투자: '📈',
  부업: '💼', 보험: '🛡', 적금: '🏦', 기부금: '🤝', 카드대금: '💳', 기타: '📦',
}

const ORDER_KEY = 'fintrack-category-order'

export default function CategoryBreakdown({ transactions, prevTransactions, customCats }: Props) {
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

  const defaultSorted = Object.entries(byCategory).sort((a, b) => b[1].amount - a[1].amount)

  const [order, setOrder] = useState<string[]>([])
  const draggedCat = useRef<string | null>(null)
  const dragOverCat = useRef<string | null>(null)

  // 저장된 순서 불러오기 (현재 달 카테고리에 맞게 보정)
  useEffect(() => {
    const saved = localStorage.getItem(ORDER_KEY)
    const currentCats = defaultSorted.map(([c]) => c)
    if (saved) {
      const parsed: string[] = JSON.parse(saved)
      const restored = [
        ...parsed.filter(c => currentCats.includes(c)),
        ...currentCats.filter(c => !parsed.includes(c)),
      ]
      setOrder(restored)
    } else {
      setOrder(currentCats)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length])

  const sorted: [string, { amount: number; count: number }][] =
    order.length > 0
      ? [
          ...order.filter(c => byCategory[c]).map(c => [c, byCategory[c]] as [string, { amount: number; count: number }]),
          ...defaultSorted.filter(([c]) => !order.includes(c)),
        ]
      : defaultSorted

  function handleDragStart(cat: string) {
    draggedCat.current = cat
  }

  function handleDragOver(e: React.DragEvent, cat: string) {
    e.preventDefault()
    dragOverCat.current = cat
  }

  function handleDrop() {
    if (!draggedCat.current || !dragOverCat.current || draggedCat.current === dragOverCat.current) return
    const next = [...order]
    const fromIdx = next.indexOf(draggedCat.current)
    const toIdx   = next.indexOf(dragOverCat.current)
    if (fromIdx === -1 || toIdx === -1) return
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, draggedCat.current)
    setOrder(next)
    localStorage.setItem(ORDER_KEY, JSON.stringify(next))
    draggedCat.current = null
    dragOverCat.current = null
  }

  if (sorted.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>지출 내역이 없어요</p>
      </div>
    )
  }

  const topCat = defaultSorted[0]?.[0]

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
      {sorted.map(([category, { amount, count }]) => {
        const pct       = total > 0 ? (amount / total) * 100 : 0
        const prevAmt   = prevByCategory[category]
        const changePct = prevAmt ? ((amount - prevAmt) / prevAmt) * 100 : null
        const colorKey  = customCats?.find(c => c.name === category)?.color
        const color     = getCategoryColor(category, colorKey)
        const comment   = getCategoryComment(category, pct, changePct)
        const isTop     = category === topCat

        return (
          <div
            key={category}
            draggable
            onDragStart={() => handleDragStart(category)}
            onDragOver={e => handleDragOver(e, category)}
            onDrop={handleDrop}
            className={`glass rounded-2xl px-4 py-4 transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98] ${isTop ? 'glow-rose' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* 드래그 핸들 */}
                <div className="flex flex-col gap-0.5 shrink-0 opacity-25 hover:opacity-60 transition-opacity pt-1 cursor-grab">
                  <span className="block w-3.5 h-px rounded-full bg-white" />
                  <span className="block w-3.5 h-px rounded-full bg-white" />
                  <span className="block w-3.5 h-px rounded-full bg-white" />
                </div>
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
