'use client'

import { useState, useMemo } from 'react'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import {
  updateTransactionCategory,
  updateTransactionCategoryByKeyword,
  updateTransactionRecurring,
  updateTransactionExcluded,
  deleteTransaction,
} from '@/lib/transactions'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onDelete: (id: string) => void
  onCategoryChange: (id: string, category: string) => void
  onBulkCategoryChange: (ids: string[], category: string) => void
  onRecurringChange: (id: string, is_recurring: boolean) => void
  onExcludedChange: (id: string, is_excluded: boolean) => void
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface DayComment {
  emoji: string
  text: string
  type: 'warning' | 'praise' | 'insight' | 'tip'
}

const COMMENT_STYLE: Record<DayComment['type'], { bg: string; border: string; text: string }> = {
  warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)',  text: 'text-amber-300' },
  praise:  { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.3)',  text: 'text-emerald-300' },
  insight: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)',  text: 'text-indigo-300' },
  tip:     { bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.3)',   text: 'text-cyan-300' },
}

const CATEGORY_TIPS: Record<string, string> = {
  식비:   '식단을 미리 계획하면 충동적인 외식을 줄일 수 있어요.',
  카페:   '카페 지출을 한 달로 합산하면 꽤 큰 금액이에요. 텀블러를 활용해볼까요?',
  쇼핑:   '장바구니에 담아두고 24시간 후에 구매하면 충동구매가 줄어요.',
  편의점: '편의점을 마트 한 번으로 대체하면 월 2~3만원을 절약할 수 있어요.',
  문화:   '문화 지출은 삶의 질에 직결돼요. 정기권이나 구독으로 단가를 낮춰보세요.',
  교통:   '대중교통 정기권을 활용하면 교통비를 20~30% 줄일 수 있어요.',
  의료:   '정기 검진은 큰 의료비를 예방하는 투자예요.',
}

function getDayInsight(
  selectedDate: string,
  selectedTxs: Transaction[],
  allTxs: Transaction[],
): DayComment | null {
  const expense = selectedTxs.filter(t => t.type === 'expense' && !t.is_excluded)
  const dayTotal = expense.reduce((s, t) => s + t.amount, 0)
  const hasIncome = selectedTxs.some(t => t.type === 'income')
  const isFuture = new Date(selectedDate + 'T00:00:00') > new Date()

  if (isFuture) return null

  if (dayTotal === 0) {
    if (hasIncome) return { emoji: '💰', text: '수입이 들어온 날이에요. 자동이체로 미리 저축 계좌에 넣어두는 게 효과적이에요.', type: 'praise' }
    return { emoji: '✨', text: '지출이 없는 날이에요. 이런 날이 모여 저축이 만들어져요!', type: 'praise' }
  }

  // 이번 달 일평균 계산 (같은 날 제외)
  const allExpenses = allTxs.filter(t => t.type === 'expense' && !t.is_excluded)
  const expenseByDate = allExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.date] = (acc[t.date] ?? 0) + t.amount
    return acc
  }, {})
  const otherDates = Object.entries(expenseByDate).filter(([d]) => d !== selectedDate)
  const avgDaily = otherDates.length > 0
    ? otherDates.reduce((s, [, v]) => s + v, 0) / otherDates.length
    : 0

  // 같은 요일 평균
  const dow = new Date(selectedDate + 'T00:00:00').getDay()
  const sameDowAmts = otherDates
    .filter(([d]) => new Date(d + 'T00:00:00').getDay() === dow)
    .map(([, v]) => v)
  const avgDow = sameDowAmts.length >= 2
    ? sameDowAmts.reduce((s, v) => s + v, 0) / sameDowAmts.length
    : null

  // 카테고리 집중도
  const catMap: Record<string, number> = {}
  for (const t of expense) catMap[t.category] = (catMap[t.category] ?? 0) + t.amount
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const topCat = sorted[0]
  const topPct = topCat ? (topCat[1] / dayTotal) * 100 : 0

  const ratio = avgDaily > 0 ? dayTotal / avgDaily : 0

  // 1순위: 일평균 대비 고지출
  if (avgDaily > 0 && ratio >= 2.5) {
    return {
      emoji: '⚠️',
      text: `오늘은 이번 달 일평균(${Math.round(avgDaily / 10000)}만원)보다 ${ratio.toFixed(1)}배 더 썼어요. 특별한 지출이 있었나요?`,
      type: 'warning',
    }
  }

  // 2순위: 같은 요일 패턴
  if (avgDow !== null && dayTotal > avgDow * 1.8) {
    const pctMore = Math.round((dayTotal / avgDow - 1) * 100)
    return {
      emoji: '📅',
      text: `${DAY_LABELS[dow]}요일 평균보다 ${pctMore}% 더 썼어요. ${DAY_LABELS[dow]}요일 소비 패턴이 반복되고 있어요.`,
      type: 'insight',
    }
  }

  // 3순위: 카테고리 집중
  if (topPct >= 75 && dayTotal >= 20000) {
    return {
      emoji: '🔍',
      text: `오늘 지출의 ${Math.round(topPct)}%가 ${topCat[0]}에 집중됐어요. ${topCat[0]} 지출이 반복되는지 확인해보세요.`,
      type: 'insight',
    }
  }

  // 4순위: 절약 칭찬
  if (avgDaily > 0 && ratio <= 0.5 && dayTotal > 0) {
    const saved = Math.round((avgDaily - dayTotal) / 1000)
    return {
      emoji: '🌟',
      text: `오늘은 평소보다 절반 이하로 썼어요. 절약한 ${saved}천원이 저축으로 이어질 수 있어요!`,
      type: 'praise',
    }
  }

  // 5순위: 카테고리별 행동경제학 팁
  const tip = topCat ? CATEGORY_TIPS[topCat[0]] : null
  if (tip) return { emoji: '💡', text: tip, type: 'tip' }

  return null
}

function getDayColor(total: number) {
  if (total <= 0) return null
  if (total < 30000) return { bar: 'bg-emerald-400/70', text: 'text-emerald-400' }
  if (total < 100000) return { bar: 'bg-amber-400/70', text: 'text-amber-400' }
  return { bar: 'bg-rose-400/70', text: 'text-rose-400' }
}

function fmt(n: number) {
  if (n >= 10000) return `${Math.round(n / 10000)}만`
  if (n >= 1000) return `${Math.round(n / 1000)}천`
  return `${n}`
}

export default function CalendarTab({
  transactions, year, month,
  onDelete, onCategoryChange, onBulkCategoryChange, onRecurringChange, onExcludedChange,
}: Props) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const defaultSelected = (() => {
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    if (isCurrentMonth) return todayStr
    const first = transactions.find(t => t.date)
    return first?.date ?? `${year}-${String(month).padStart(2, '0')}-01`
  })()

  const [selectedDate, setSelectedDate] = useState(defaultSelected)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<{ category: string; is_recurring: boolean; is_excluded: boolean } | null>(null)
  const [bulkPrompt, setBulkPrompt] = useState<{ keyword: string; category: string; count: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 날짜별 지출 합계 맵
  const dailyMap = useMemo(() => {
    const map: Record<string, { expense: number; income: number }> = {}
    for (const t of transactions) {
      if (!map[t.date]) map[t.date] = { expense: 0, income: 0 }
      if (!t.is_excluded) {
        if (t.type === 'expense') map[t.date].expense += t.amount
        else map[t.date].income += t.amount
      }
    }
    return map
  }, [transactions])

  // 달력 그리드 계산
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=일
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedTxs = transactions.filter(t => t.date === selectedDate)
  const selectedExpense = selectedTxs.filter(t => t.type === 'expense' && !t.is_excluded).reduce((s, t) => s + t.amount, 0)
  const selectedIncome = selectedTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const dayInsight = useMemo(
    () => getDayInsight(selectedDate, selectedTxs, transactions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, transactions],
  )

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditState({ category: tx.category, is_recurring: tx.is_recurring, is_excluded: tx.is_excluded })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  async function saveEdit(tx: Transaction) {
    if (!editState) return
    setSaving(true)
    try {
      const promises: Promise<void>[] = []
      if (editState.category !== tx.category) {
        promises.push(updateTransactionCategory(tx.id, editState.category))
        onCategoryChange(tx.id, editState.category)
        if (tx.description?.trim()) {
          fetch('/api/learn-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant: tx.description.trim(), category: editState.category }),
          })
        }
      }
      if (editState.is_recurring !== tx.is_recurring) {
        promises.push(updateTransactionRecurring(tx.id, editState.is_recurring))
        onRecurringChange(tx.id, editState.is_recurring)
      }
      if (editState.is_excluded !== tx.is_excluded) {
        promises.push(updateTransactionExcluded(tx.id, editState.is_excluded))
        onExcludedChange(tx.id, editState.is_excluded)
      }
      await Promise.all(promises)

      if (editState.category !== tx.category && tx.description) {
        const keyword = tx.description.trim()
        const same = transactions.filter(t => t.id !== tx.id && t.description?.includes(keyword) && t.category !== editState.category)
        if (same.length > 0) setBulkPrompt({ keyword, category: editState.category, count: same.length })
      }
      setEditingId(null)
      setEditState(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    onDelete(id)
    setConfirmDeleteId(null)
  }

  async function handleBulk(scope: 'current_month' | 'all') {
    if (!bulkPrompt) return
    const updatedIds = await updateTransactionCategoryByKeyword(bulkPrompt.keyword, bulkPrompt.category, scope, year, month)
    onBulkCategoryChange(updatedIds, bulkPrompt.category)
    fetch('/api/learn-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: bulkPrompt.keyword, category: bulkPrompt.category }),
    })
    setBulkPrompt(null)
  }

  const selectedDStr = (() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_LABELS[d.getDay()]})`
  })()

  return (
    <div className="space-y-3">
      {/* 달력 */}
      <div className="glass rounded-2xl px-3 py-4">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : ''}`}
              style={{ color: i > 0 && i < 6 ? 'var(--text-muted)' : undefined }}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const ds = dateStr(day)
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            const data = dailyMap[ds]
            const expense = data?.expense ?? 0
            const income = data?.income ?? 0
            const color = getDayColor(expense)
            const dow = (firstDayOfWeek + day - 1) % 7

            return (
              <button
                key={idx}
                onClick={() => { setSelectedDate(ds); setEditingId(null); setEditState(null) }}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-500/25 ring-1 ring-indigo-400/50'
                    : 'hover:bg-white/5'
                }`}
              >
                {/* 날짜 숫자 */}
                <span className={`text-xs font-semibold leading-none ${
                  isToday
                    ? 'w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]'
                    : dow === 0 ? 'text-rose-400'
                    : dow === 6 ? 'text-blue-400'
                    : isSelected ? 'text-white' : ''
                }`}
                  style={{ color: !isToday && dow > 0 && dow < 6 && !isSelected ? 'var(--text-secondary)' : undefined }}
                >
                  {isToday ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                      {day}
                    </span>
                  ) : day}
                </span>

                {/* 지출 표시 */}
                {expense > 0 && (
                  <div className="mt-0.5 flex flex-col items-center gap-0.5 w-full px-1">
                    <div className={`h-0.5 w-full rounded-full ${color?.bar ?? 'bg-white/20'}`} />
                    <span className={`text-[9px] leading-none font-medium ${color?.text ?? ''}`}>
                      {fmt(expense)}
                    </span>
                  </div>
                )}
                {income > 0 && expense === 0 && (
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 날짜 헤더 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-white">{selectedDStr}</p>
        <div className="flex items-center gap-2">
          {selectedIncome > 0 && (
            <span className="text-xs text-cyan-400 font-semibold">+{selectedIncome.toLocaleString('ko-KR')}원</span>
          )}
          {selectedExpense > 0 && (
            <span className="text-xs text-rose-400 font-semibold">-{selectedExpense.toLocaleString('ko-KR')}원</span>
          )}
        </div>
      </div>

      {/* 해당 날짜 거래 목록 */}
      {selectedTxs.length === 0 ? (
        <div className="glass rounded-2xl py-10 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>이 날은 내역이 없어요</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {selectedTxs.map(tx => {
            const isEditing = editingId === tx.id
            const cc = getCategoryColor(tx.category)
            const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
            const hasChanged = editState
              ? editState.category !== tx.category || editState.is_recurring !== tx.is_recurring || editState.is_excluded !== tx.is_excluded
              : false

            return (
              <div key={tx.id} className={`px-4 py-3 group transition-colors ${tx.is_excluded ? 'opacity-50' : ''}`}>
                {isEditing && editState ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1">
                      {cats.map(c => {
                        const ccc = getCategoryColor(c)
                        return (
                          <button
                            key={c}
                            onClick={() => setEditState(s => s ? { ...s, category: c } : s)}
                            className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                              editState.category === c
                                ? `${ccc.bg} ${ccc.text} ring-1 ring-white/15 font-semibold`
                                : 'glass-sm text-white/45 hover:text-white/80'
                            }`}
                          >
                            {c}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setEditState(s => s ? { ...s, is_recurring: !s.is_recurring } : s)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                          editState.is_recurring
                            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/25 font-semibold'
                            : 'glass-sm text-white/45 hover:text-white/80'
                        }`}
                      >
                        {editState.is_recurring ? '고정 ✓' : '고정 아님'}
                      </button>
                      <button
                        onClick={() => setEditState(s => s ? { ...s, is_excluded: !s.is_excluded } : s)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                          editState.is_excluded
                            ? 'bg-zinc-500/25 text-zinc-300 ring-1 ring-zinc-400/20 font-semibold'
                            : 'glass-sm text-white/45 hover:text-white/80'
                        }`}
                      >
                        {editState.is_excluded ? '지출 제외 ✓' : '지출 포함'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasChanged && (
                        <button
                          onClick={() => saveEdit(tx)}
                          disabled={saving}
                          className="text-xs px-3 py-1 rounded-full font-semibold transition-all disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white' }}
                        >
                          {saving ? '저장 중…' : '저장'}
                        </button>
                      )}
                      <button onClick={cancelEdit} className="text-xs px-2 py-0.5 rounded-full glass-sm text-rose-400">
                        취소
                      </button>
                    </div>
                  </div>
                ) : confirmDeleteId === tx.id ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/60 flex-1">삭제할까요?</p>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-semibold hover:bg-rose-500/30 transition-colors"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2.5 py-1 rounded-full glass-sm text-white/50"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => startEdit(tx)}
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 hover:opacity-75 transition-all ${cc.bg} ${cc.text}`}
                        >
                          {tx.category} ✎
                        </button>
                        {tx.is_recurring && (
                          <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">고정</span>
                        )}
                        {tx.is_excluded && (
                          <span className="text-xs bg-zinc-500/20 text-zinc-400 px-1.5 py-0.5 rounded-full shrink-0">지출 제외</span>
                        )}
                        {tx.payment_method && (
                          <span className="text-xs glass-sm px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {tx.payment_method}
                          </span>
                        )}
                      </div>
                      {tx.description && (
                        <p className="text-sm font-medium mt-1 truncate text-white/80">{tx.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`text-sm font-bold ${
                        tx.is_excluded ? 'text-white/35 line-through' :
                        tx.type === 'income' ? 'text-cyan-300' : 'text-rose-300'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ko-KR')}
                        <span className="text-xs font-normal ml-0.5 opacity-50">원</span>
                      </span>
                      <button
                        onClick={() => setConfirmDeleteId(tx.id)}
                        className="text-white/15 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* AI 코멘트 카드 */}
      {dayInsight && (() => {
        const s = COMMENT_STYLE[dayInsight.type]
        return (
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <span className="text-lg shrink-0 mt-0.5">{dayInsight.emoji}</span>
            <p className={`text-xs leading-relaxed ${s.text}`}>{dayInsight.text}</p>
          </div>
        )
      })()}

      {/* 일괄 카테고리 변경 프롬프트 */}
      {bulkPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4" onClick={() => setBulkPrompt(null)}>
          <div className="glass rounded-2xl p-6 w-full sm:max-w-sm glow-indigo space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-sm font-semibold text-white mb-1">일괄 카테고리 변경</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-white font-medium">"{bulkPrompt.keyword}"</span>이 포함된 항목{' '}
                <span className="text-indigo-300 font-semibold">{bulkPrompt.count}건</span>도{' '}
                <span className={`font-semibold ${getCategoryColor(bulkPrompt.category).text}`}>{bulkPrompt.category}</span>로 변경할까요?
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleBulk('current_month')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                이번 달 {bulkPrompt.count}건 모두 변경
              </button>
              <button
                onClick={() => handleBulk('all')}
                className="w-full py-2.5 rounded-xl text-sm font-medium glass-sm text-white/70 hover:text-white transition-colors"
              >
                전체 기간 모두 변경
              </button>
              <button
                onClick={() => setBulkPrompt(null)}
                className="w-full py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                현재 항목만 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
