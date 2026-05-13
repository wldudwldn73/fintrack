'use client'

import { useState } from 'react'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { updateTransactionCategory, updateTransactionAmount } from '@/lib/transactions'
import { type CustomCat } from '@/components/CategoryPicker'
import { type CategoryWidget } from '@/lib/categoryWidgets'

const QUICK_EMOJIS = ['🍽', '🛒', '☕', '🚗', '🏠', '💊', '🎬', '📚', '💳', '💰', '🎁', '👗', '✈️', '📱', '🎮']

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  customCats?: CustomCat[]
  onCategoryChange: (id: string, category: string) => void
  widgets: CategoryWidget[]
  onWidgetSave: (w: Omit<CategoryWidget, 'id'> & { id?: string }) => Promise<void>
  onWidgetDelete: (id: string) => Promise<void>
  onAmountChange: (id: string, amount: number) => void
}

function InlineAmount({ tx, onAmountChange, className }: {
  tx: Transaction
  onAmountChange: (id: string, amount: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  async function save() {
    const n = Number(value.replace(/,/g, ''))
    if (!isNaN(n) && n > 0 && n !== tx.amount) {
      await updateTransactionAmount(tx.id, n)
      onAmountChange(tx.id, n)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-24 text-right glass-sm rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
      />
    )
  }

  return (
    <span
      className={`cursor-pointer select-none ${className ?? ''}`}
      onDoubleClick={() => { setEditing(true); setValue(String(tx.amount)) }}
      title="더블클릭하여 금액 수정"
    >
      {tx.amount.toLocaleString('ko-KR')}원
    </span>
  )
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

function CategoryBadge({
  tx, customCats, onCategoryChange,
}: { tx: Transaction; customCats?: CustomCat[]; onCategoryChange: (id: string, cat: string) => void }) {
  const [editing, setEditing] = useState(false)
  const colorKey = customCats?.find(c => c.name === tx.category)?.color
  const colors = getCategoryColor(tx.category, colorKey)
  const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const userCats = customCats?.filter(c => c.type === tx.type && !cats.includes(c.name as never)) ?? []

  if (editing) {
    return (
      <div className="flex flex-wrap gap-1 mt-1" onClick={e => e.stopPropagation()}>
        {[...cats, ...userCats.map(c => c.name)].map(c => {
          const ck = customCats?.find(cc => cc.name === c)?.color
          const cc = getCategoryColor(c, ck)
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

function WidgetEditor({
  initial, allCats, onSave, onCancel, saving,
}: {
  initial: CategoryWidget
  allCats: string[]
  onSave: (data: Omit<CategoryWidget, 'id'> & { id?: string }) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial.name)
  const [emoji, setEmoji] = useState(initial.emoji)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(initial.categories))

  function toggleCat(cat: string) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || selectedCats.size === 0) return
    await onSave({
      id: initial.id,
      name: name.trim(),
      emoji,
      categories: allCats.filter(c => selectedCats.has(c)),
      sort_order: initial.sort_order,
    })
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">위젯 편집</p>
        <button onClick={onCancel} className="text-white/40 hover:text-white/70 text-xl leading-none">×</button>
      </div>

      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          className="w-12 text-center glass-sm rounded-xl py-2 text-lg bg-transparent outline-none"
          maxLength={2}
        />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="위젯 이름"
          className="flex-1 glass-sm rounded-xl px-3 py-2 text-sm text-white bg-transparent outline-none placeholder-white/30"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`w-8 h-8 rounded-lg text-base transition-all ${emoji === e ? 'glass-sm ring-1 ring-white/25' : 'hover:glass-sm'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>포함할 카테고리</p>
        <div className="flex flex-wrap gap-1.5">
          {allCats.map(cat => {
            const selected = selectedCats.has(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
                  selected
                    ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400/30'
                    : 'glass-sm text-white/45 hover:text-white/70'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || selectedCats.size === 0}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm glass-sm" style={{ color: 'var(--text-muted)' }}>
          취소
        </button>
      </div>
    </div>
  )
}

function WidgetCard({
  widget, expenses, customCats, onEdit, onDelete,
}: {
  widget: CategoryWidget
  expenses: Transaction[]
  customCats?: CustomCat[]
  onEdit: () => void
  onDelete: () => void
}) {
  const catAmts: Record<string, number> = {}
  for (const t of expenses) {
    if (widget.categories.includes(t.category)) {
      catAmts[t.category] = (catAmts[t.category] ?? 0) + t.amount
    }
  }
  const total = widget.categories.reduce((s, c) => s + (catAmts[c] ?? 0), 0)
  if (total === 0) return null

  function catColor(name: string) {
    const key = customCats?.find(c => c.name === name)?.color
    return getCategoryColor(name, key)
  }

  const cols = widget.categories.length <= 1 ? 'grid grid-cols-1'
    : widget.categories.length === 2 ? 'grid grid-cols-2'
    : 'grid grid-cols-3'

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{widget.emoji}</span>
          <p className="text-sm font-semibold text-white">{widget.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-orange-300">
            {total > 0 ? `${total.toLocaleString('ko-KR')}원` : '-'}
          </span>
          <button onClick={onEdit} className="text-white/30 hover:text-white/70 text-sm transition-colors" title="편집">✎</button>
          <button onClick={onDelete} className="text-white/30 hover:text-rose-400 text-base leading-none transition-colors" title="삭제">×</button>
        </div>
      </div>
      <div className={`${cols} divide-x divide-white/5`}>
        {widget.categories.map(cat => {
          const amt = catAmts[cat] ?? 0
          const cc = catColor(cat)
          const pct = total > 0 ? Math.round((amt / total) * 100) : 0
          return (
            <div key={cat} className={`px-3 py-3 text-center ${amt === 0 ? 'opacity-30' : ''}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cc.bg} ${cc.text}`}>{cat}</span>
              <p className="text-sm font-bold text-white mt-2">{amt > 0 ? amt.toLocaleString('ko-KR') : '-'}</p>
              {amt > 0 && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}%</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ transactions, year, month, customCats, onCategoryChange, widgets, onWidgetSave, onWidgetDelete, onAmountChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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

  function catColor(name: string) {
    const key = customCats?.find(c => c.name === name)?.color
    return getCategoryColor(name, key)
  }

  async function handleWidgetSave(data: Omit<CategoryWidget, 'id'> & { id?: string }) {
    setSaving(true)
    try {
      await onWidgetSave(data)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const allCats = [
    ...EXPENSE_CATEGORIES,
    ...(customCats?.filter(c => c.type === 'expense').map(c => c.name) ?? []),
  ]

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

      {/* 커스텀 위젯 */}
      {widgets.map(widget =>
        editingId === widget.id ? (
          <WidgetEditor
            key={widget.id}
            initial={widget}
            allCats={allCats}
            onSave={handleWidgetSave}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        ) : (
          <WidgetCard
            key={widget.id}
            widget={widget}
            expenses={expenses}
            customCats={customCats}
            onEdit={() => setEditingId(widget.id)}
            onDelete={() => onWidgetDelete(widget.id)}
          />
        )
      )}

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
              const cc = catColor(tx.category)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cc.bg} ${cc.text}`}>{tx.category}</span>
                    <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{tx.description ?? '(내역없음)'}</span>
                  </div>
                  <InlineAmount tx={tx} onAmountChange={onAmountChange} className="text-sm font-semibold text-amber-300 ml-2 shrink-0" />
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
                        <CategoryBadge tx={tx} customCats={customCats} onCategoryChange={onCategoryChange} />
                        {tx.is_recurring && (
                          <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">고정</span>
                        )}
                        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{tx.description ?? '(내역없음)'}</span>
                      </div>
                      <InlineAmount tx={tx} onAmountChange={onAmountChange} className="text-sm text-white/75 ml-2 shrink-0" />
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
