'use client'

import { useState } from 'react'
import { Transaction, Budget, EXPENSE_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { upsertBudget, deleteBudget } from '@/lib/budget'

interface Props {
  transactions: Transaction[]
  budgets: Budget[]
  year: number
  month: number
  onBudgetsChange: (budgets: Budget[]) => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍽', 카페: '☕', 편의점: '🏪', 교통: '🚌', 쇼핑: '🛍', 구독: '📱',
  주거: '🏠', 의료: '💊', 문화: '🎬', 교육: '📚', 투자: '📈', 기타: '📦',
}

export default function BudgetCard({ transactions, budgets, year, month, onBudgetsChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const expenses = transactions.filter(t => t.type === 'expense')

  // 카테고리별 실지출
  const actual = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})

  const totalActual = expenses.reduce((s, t) => s + t.amount, 0)
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)

  if (budgets.length === 0 && !editing) {
    return (
      <div className="glass rounded-2xl px-5 py-6 text-center">
        <p className="text-2xl mb-2">🎯</p>
        <p className="text-sm font-semibold text-white mb-1">예산 계획을 설정해보세요</p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>카테고리별 목표 금액을 입력하면 달성률을 확인할 수 있어요</p>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          이번 달 계획 설정
        </button>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const newBudgets: Budget[] = []
      for (const [category, val] of Object.entries(editValues)) {
        const amount = parseInt(val.replace(/,/g, ''), 10)
        if (isNaN(amount) || amount < 0) continue
        if (amount === 0) {
          const existing = budgets.find(b => b.category === category)
          if (existing) {
            await deleteBudget(existing.id)
          }
        } else {
          await upsertBudget({ year, month, category, amount })
          newBudgets.push({ id: '', year, month, category, amount })
        }
      }
      // 편집되지 않은 기존 예산은 유지
      const kept = budgets.filter(b => {
        const v = editValues[b.category]
        return v === undefined || parseInt(v.replace(/,/g, ''), 10) > 0
      }).map(b => {
        const v = editValues[b.category]
        return v !== undefined ? { ...b, amount: parseInt(v.replace(/,/g, ''), 10) } : b
      })
      const merged = [
        ...kept,
        ...newBudgets.filter(nb => !kept.some(k => k.category === nb.category)),
      ]
      onBudgetsChange(merged.filter(b => b.amount > 0))
      setEditing(false)
      setEditValues({})
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="glass rounded-2xl p-5 glow-indigo space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">이번 달 예산 설정</p>
          <span className="text-xs ai-badge px-2 py-0.5 rounded-full text-indigo-300">{year}년 {month}월</span>
        </div>
        <div className="space-y-2">
          {EXPENSE_CATEGORIES.map(cat => {
            const existing = budgets.find(b => b.category === cat)
            const color = getCategoryColor(cat)
            return (
              <div key={cat} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${color.bg} shrink-0`}>
                  {CATEGORY_EMOJI[cat] ?? '📦'}
                </div>
                <span className={`text-xs font-medium w-14 shrink-0 ${color.text}`}>{cat}</span>
                <input
                  type="number"
                  placeholder={existing ? existing.amount.toLocaleString('ko-KR') : '0'}
                  defaultValue={existing?.amount ?? ''}
                  onChange={e => setEditValues(v => ({ ...v, [cat]: e.target.value }))}
                  className="flex-1 glass-sm rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>원</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setEditing(false); setEditValues({}) }}
            className="flex-1 py-2.5 rounded-xl glass-sm text-white/50 text-sm hover:text-white/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  const overBudget = budgets.filter(b => (actual[b.category] || 0) > b.amount)
  const totalPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">계획 대비 현황</p>
          {overBudget.length > 0 && (
            <p className="text-xs mt-0.5 text-rose-400 font-medium">{overBudget.map(b => b.category).join(', ')} 초과 중</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs glass-sm px-2.5 py-1 rounded-lg transition-all hover:text-white/80"
          style={{ color: 'var(--text-muted)' }}
        >
          수정
        </button>
      </div>

      {/* Total progress */}
      {totalBudget > 0 && (
        <div className="glass-sm rounded-xl px-4 py-3">
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--text-muted)' }}>전체 예산</span>
            <span className={`font-semibold ${totalPct > 100 ? 'text-rose-400' : totalPct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalPct}% 사용
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(totalPct, 100)}%`,
                background: totalPct > 100 ? 'linear-gradient(90deg,#f43f5e,#fb923c)' :
                            totalPct > 80  ? 'linear-gradient(90deg,#fbbf24,#f97316)' :
                            'linear-gradient(90deg,#34d399,#22d3ee)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span style={{ color: 'var(--text-muted)' }}>{totalActual.toLocaleString('ko-KR')}원</span>
            <span style={{ color: 'var(--text-muted)' }}>/ {totalBudget.toLocaleString('ko-KR')}원</span>
          </div>
        </div>
      )}

      {/* Per-category */}
      <div className="space-y-3">
        {budgets.map(b => {
          const spent = actual[b.category] || 0
          const pct   = Math.round((spent / b.amount) * 100)
          const over  = spent > b.amount
          const color = getCategoryColor(b.category)
          const remaining = b.amount - spent

          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{CATEGORY_EMOJI[b.category] ?? '📦'}</span>
                  <span className={`text-xs font-semibold ${color.text}`}>{b.category}</span>
                  {over && (
                    <span className="text-xs bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full font-semibold">초과</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${over ? 'text-rose-400' : 'text-white/80'}`}>
                    {pct}%
                  </span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    ({over ? '+' : ''}{Math.abs(remaining).toLocaleString('ko-KR')}원 {over ? '초과' : '남음'})
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: over ? 'linear-gradient(90deg,#f43f5e,#fb923c)' :
                                pct > 80 ? `linear-gradient(90deg,#fbbf24,${color.dot})` :
                                `linear-gradient(90deg,${color.dot},${color.dot}99)`,
                    boxShadow: over ? '0 0 6px rgba(244,63,94,0.5)' : `0 0 5px ${color.dot}50`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>{spent.toLocaleString('ko-KR')}원</span>
                <span>목표 {b.amount.toLocaleString('ko-KR')}원</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
