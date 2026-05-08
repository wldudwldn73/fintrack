'use client'

import { useState } from 'react'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { updateTransactionCategory } from '@/lib/transactions'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onCategoryChange: (id: string, category: string) => void
}

function getWeekOfMonth(dateStr: string, year: number, month: number) {
  const d        = new Date(dateStr + 'T00:00:00')
  const firstDay = new Date(year, month - 1, 1).getDay()
  return Math.ceil((d.getDate() + firstDay) / 7)
}

function getWeekLabel(week: number, year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const start    = new Date(firstDay)
  start.setDate(1 + (week - 1) * 7 - firstDay.getDay())
  if (start.getMonth() !== month - 1) start.setDate(1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  if (end.getMonth() !== month - 1) end.setDate(new Date(year, month, 0).getDate())
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${week}주 (${fmt(start)}~${fmt(end)})`
}

function CategoryBadge({ tx, onCategoryChange }: { tx: Transaction; onCategoryChange: (id: string, cat: string) => void }) {
  const [editing, setEditing] = useState(false)
  const colors = getCategoryColor(tx.category)
  const cats   = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  if (editing) {
    return (
      <div className="flex flex-wrap gap-1 mt-1" onClick={e => e.stopPropagation()}>
        {cats.map(c => {
          const cc = getCategoryColor(c)
          return (
            <button
              key={c}
              onClick={async () => {
                await updateTransactionCategory(tx.id, c)
                onCategoryChange(tx.id, c)
                setEditing(false)
              }}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                tx.category === c
                  ? `${cc.bg} ${cc.text} ring-1 ring-white/15 font-semibold`
                  : 'glass-sm text-white/45 hover:text-white/80'
              }`}
            >
              {c}
            </button>
          )
        })}
        <button onClick={() => setEditing(false)} className="text-xs px-2 py-0.5 rounded-full glass-sm text-rose-400">취소</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colors.bg} ${colors.text} hover:opacity-75 transition-all`}
    >
      {tx.category} ✎
    </button>
  )
}

export default function Dashboard({ transactions, year, month, onCategoryChange }: Props) {
  const expenses         = transactions.filter(t => t.type === 'expense')
  const fixedExpenses    = expenses.filter(t => t.is_recurring)
  const variableExpenses = expenses.filter(t => !t.is_recurring)
  const fixedTotal       = fixedExpenses.reduce((s, t) => s + t.amount, 0)
  const variableTotal    = variableExpenses.reduce((s, t) => s + t.amount, 0)
  const totalExpense     = fixedTotal + variableTotal
  const fixedRatio       = totalExpense > 0 ? Math.round((fixedTotal / totalExpense) * 100) : 0

  // 주별 지출
  const weeklyMap: Record<number, number> = {}
  for (const t of expenses) {
    const w = getWeekOfMonth(t.date, year, month)
    weeklyMap[w] = (weeklyMap[w] ?? 0) + t.amount
  }
  const weeks     = Object.entries(weeklyMap).map(([w, amt]) => ({ week: Number(w), amount: amt })).sort((a, b) => a.week - b.week)
  const maxWeekly = Math.max(...weeks.map(w => w.amount), 1)

  // 결제수단 × 기관별 그룹
  type MethodGroup = { key: string; payment_method: string; institution: string | null; total: number; txs: Transaction[] }
  const methodMap: Record<string, MethodGroup> = {}
  for (const t of expenses) {
    const pm   = t.payment_method ?? '직접입력'
    const inst = t.institution ?? null
    const key  = `${inst ?? ''}__${pm}`
    if (!methodMap[key]) methodMap[key] = { key, payment_method: pm, institution: inst, total: 0, txs: [] }
    methodMap[key].total += t.amount
    methodMap[key].txs.push(t)
  }
  const methods = Object.values(methodMap).sort((a, b) => b.total - a.total).map(m => ({
    ...m, txs: m.txs.sort((a, b) => b.amount - a.amount),
  }))

  if (expenses.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>지출 내역이 없어요</p>
      </div>
    )
  }

  const fixedBarColor = fixedRatio > 50
    ? 'linear-gradient(90deg, #f43f5e, #fb923c)'
    : fixedRatio > 30
    ? 'linear-gradient(90deg, #fbbf24, #f97316)'
    : 'linear-gradient(90deg, #34d399, #22d3ee)'
  const fixedTextColor = fixedRatio > 50 ? 'text-rose-400' : fixedRatio > 30 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="space-y-4">
      {/* 고정 vs 변동 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl px-4 py-4 glow-amber relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-18 h-18 rounded-full blur-2xl pointer-events-none opacity-25"
            style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>고정지출</p>
          <p className="text-lg font-bold text-amber-300 text-glow-amber">{fixedTotal.toLocaleString('ko-KR')}원</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fixedExpenses.length}건</p>
        </div>
        <div className="glass rounded-2xl px-4 py-4 relative overflow-hidden">
          <div className="absolute -top-5 -right-5 w-18 h-18 rounded-full blur-2xl pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>변동지출</p>
          <p className="text-lg font-bold text-white">{variableTotal.toLocaleString('ko-KR')}원</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{variableExpenses.length}건</p>
        </div>
      </div>

      {/* 고정지출 비율 */}
      {totalExpense > 0 && (
        <div className="glass rounded-2xl px-4 py-3.5">
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--text-muted)' }}>고정지출 비율</span>
            <span className={`font-semibold ${fixedTextColor}`}>{fixedRatio}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fixedRatio}%`, background: fixedBarColor }} />
          </div>
        </div>
      )}

      {/* 고정지출 항목 */}
      {fixedExpenses.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">고정지출 항목</p>
            <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold">{fixedExpenses.length}건</span>
          </div>
          <div className="divide-y divide-white/5">
            {fixedExpenses.sort((a, b) => b.amount - a.amount).map(tx => {
              const cc = getCategoryColor(tx.category)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cc.bg} ${cc.text}`}>{tx.category}</span>
                    <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{tx.description ?? '(내역없음)'}</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-300 ml-2 shrink-0">{tx.amount.toLocaleString('ko-KR')}원</span>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/5 flex justify-between" style={{ background: 'rgba(251,191,36,0.05)' }}>
            <span className="text-xs text-amber-400 font-medium">합계</span>
            <span className="text-sm font-bold text-amber-300">{fixedTotal.toLocaleString('ko-KR')}원</span>
          </div>
        </div>
      )}

      {/* 주별 지출 */}
      <div className="glass rounded-2xl px-4 py-5">
        <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>주별 지출</p>
        <div className="space-y-3">
          {weeks.map(({ week, amount }) => {
            const pct   = (amount / maxWeekly) * 100
            const isMax = amount === maxWeekly
            return (
              <div key={week}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{getWeekLabel(week, year, month)}</span>
                  <span className={`text-xs font-semibold ${isMax ? 'text-rose-400' : 'text-white/80'}`}>
                    {amount.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: isMax ? 'linear-gradient(90deg, #f43f5e, #fb923c)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                      boxShadow:  isMax ? '0 0 8px rgba(244,63,94,0.45)' : '0 0 6px rgba(99,102,241,0.4)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 결제수단별 */}
      {methods.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>결제수단별</p>
          {methods.map(m => (
            <div key={m.key} className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{m.payment_method}</span>
                  {m.institution && (
                    <span className="text-xs glass-sm px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>{m.institution}</span>
                  )}
                </div>
                <span className="text-sm font-bold text-rose-400">-{m.total.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="divide-y divide-white/5">
                {m.txs.map(tx => (
                  <div key={tx.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <CategoryBadge tx={tx} onCategoryChange={onCategoryChange} />
                        {tx.is_recurring && (
                          <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">고정</span>
                        )}
                        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{tx.description ?? '(내역없음)'}</span>
                      </div>
                      <span className="text-sm text-white/75 ml-2 shrink-0">{tx.amount.toLocaleString('ko-KR')}원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
