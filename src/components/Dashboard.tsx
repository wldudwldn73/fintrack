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
  const d = new Date(dateStr + 'T00:00:00')
  const firstDay = new Date(year, month - 1, 1).getDay()
  return Math.ceil((d.getDate() + firstDay) / 7)
}

function getWeekLabel(week: number, year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const start = new Date(firstDay)
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
  const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

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
              className={`text-xs px-2 py-0.5 rounded-full ${tx.category === c ? `${cc.bg} ${cc.text} font-semibold` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          )
        })}
        <button onClick={() => setEditing(false)} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-400">취소</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colors.bg} ${colors.text} hover:opacity-80`}
    >
      {tx.category} ✎
    </button>
  )
}

export default function Dashboard({ transactions, year, month, onCategoryChange }: Props) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const fixedExpenses = expenses.filter(t => t.is_recurring)
  const variableExpenses = expenses.filter(t => !t.is_recurring)
  const fixedTotal = fixedExpenses.reduce((s, t) => s + t.amount, 0)
  const variableTotal = variableExpenses.reduce((s, t) => s + t.amount, 0)

  // 주별 지출
  const weeklyMap: Record<number, number> = {}
  for (const t of expenses) {
    const w = getWeekOfMonth(t.date, year, month)
    weeklyMap[w] = (weeklyMap[w] ?? 0) + t.amount
  }
  const weeks = Object.entries(weeklyMap)
    .map(([w, amt]) => ({ week: Number(w), amount: amt }))
    .sort((a, b) => a.week - b.week)
  const maxWeekly = Math.max(...weeks.map(w => w.amount), 1)

  // 결제수단 × 기관별 그룹
  type MethodGroup = {
    key: string
    payment_method: string
    institution: string | null
    total: number
    txs: Transaction[]
  }
  const methodMap: Record<string, MethodGroup> = {}
  for (const t of expenses) {
    const pm = t.payment_method ?? '직접입력'
    const inst = t.institution ?? null
    const key = `${inst ?? ''}__${pm}`
    if (!methodMap[key]) methodMap[key] = { key, payment_method: pm, institution: inst, total: 0, txs: [] }
    methodMap[key].total += t.amount
    methodMap[key].txs.push(t)
  }
  const methods = Object.values(methodMap)
    .sort((a, b) => b.total - a.total)
    .map(m => ({ ...m, txs: m.txs.sort((a, b) => b.amount - a.amount) }))

  if (expenses.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">지출 내역이 없어요</div>
  }

  return (
    <div className="space-y-4">
      {/* 고정 vs 변동 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">고정지출</p>
          <p className="text-lg font-bold text-orange-500">{fixedTotal.toLocaleString('ko-KR')}원</p>
          <p className="text-xs text-gray-400 mt-0.5">{fixedExpenses.length}건</p>
        </div>
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">변동지출</p>
          <p className="text-lg font-bold text-gray-800">{variableTotal.toLocaleString('ko-KR')}원</p>
          <p className="text-xs text-gray-400 mt-0.5">{variableExpenses.length}건</p>
        </div>
      </div>

      {/* 고정지출 항목 */}
      {fixedExpenses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">고정지출 항목</p>
            <span className="text-xs text-orange-500 font-medium">{fixedExpenses.length}건</span>
          </div>
          <div className="divide-y divide-gray-50">
            {fixedExpenses
              .sort((a, b) => b.amount - a.amount)
              .map(tx => {
                const cc = getCategoryColor(tx.category)
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cc.bg} ${cc.text}`}>{tx.category}</span>
                      <span className="text-sm text-gray-700 truncate">{tx.description ?? '(내역없음)'}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 ml-2 shrink-0">{tx.amount.toLocaleString('ko-KR')}원</span>
                  </div>
                )
              })}
          </div>
          <div className="px-4 py-3 bg-orange-50 border-t border-orange-100 flex justify-between">
            <span className="text-xs text-orange-600 font-medium">합계</span>
            <span className="text-sm font-bold text-orange-600">{fixedTotal.toLocaleString('ko-KR')}원</span>
          </div>
        </div>
      )}

      {/* 주별 지출 */}
      <div className="bg-white rounded-2xl px-4 py-5 shadow-sm">
        <p className="text-xs text-gray-400 mb-3">주별 지출</p>
        <div className="space-y-2.5">
          {weeks.map(({ week, amount }) => (
            <div key={week}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">{getWeekLabel(week, year, month)}</span>
                <span className="text-xs font-semibold text-gray-800">{amount.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-800 rounded-full" style={{ width: `${(amount / maxWeekly) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 결제수단별 내역 */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400 px-1">결제수단별</p>
        {methods.map(m => (
          <div key={m.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{m.payment_method}</span>
                {m.institution && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m.institution}</span>
                )}
              </div>
              <span className="text-sm font-bold text-red-500">-{m.total.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="divide-y divide-gray-50">
              {m.txs.map(tx => (
                <div key={tx.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryBadge tx={tx} onCategoryChange={onCategoryChange} />
                      {tx.is_recurring && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full shrink-0">고정</span>
                      )}
                      <span className="text-sm text-gray-700 truncate">{tx.description ?? '(내역없음)'}</span>
                    </div>
                    <span className="text-sm text-gray-800 ml-2 shrink-0">{tx.amount.toLocaleString('ko-KR')}원</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
