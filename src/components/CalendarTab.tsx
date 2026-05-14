'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Transaction } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import {
  updateTransactionCategory,
  updateTransactionCategoryByKeyword,
  updateTransactionRecurring,
  updateTransactionExcluded,
  updateTransactionHidden,
  updateTransactionMeta,
  updateTransactionAmount,
  updateTransactionDate,
  updateTransactionSortOrders,
  excludeTransactionsByKeyword,
  deleteTransaction,
} from '@/lib/transactions'
import CategoryPicker, { type CustomCat } from '@/components/CategoryPicker'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onDelete: (id: string) => void
  onCategoryChange: (id: string, category: string) => void
  onBulkCategoryChange: (ids: string[], category: string) => void
  onRecurringChange: (id: string, is_recurring: boolean) => void
  onExcludedChange: (id: string, is_excluded: boolean) => void
  onBulkExcludedChange: (ids: string[]) => void
  customCats: CustomCat[]
  onCatsChange: (cats: CustomCat[]) => void
  onMetaChange: (id: string, description: string | null, memo: string | null) => void
  onAmountChange: (id: string, amount: number) => void
  onSortOrderChange: (updates: { id: string; sort_order: number }[]) => void
  onHiddenChange: (id: string, is_hidden: boolean) => void
  onDateChange: (id: string, date: string) => void
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
  카드대금: '카드 결제일 전 잔액을 미리 확인해두면 연체나 예상치 못한 지출을 막을 수 있어요.',
}

function getDayInsights(
  selectedDate: string,
  selectedTxs: Transaction[],
  allTxs: Transaction[],
): DayComment[] {
  const expense = selectedTxs.filter(t => t.type === 'expense' && !t.is_excluded)
  const dayTotal = expense.reduce((s, t) => s + t.amount, 0)
  const hasIncome = selectedTxs.some(t => t.type === 'income')
  const incomeTotal = selectedTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const isFuture = new Date(selectedDate + 'T00:00:00') > new Date()

  if (isFuture) return []

  if (dayTotal === 0) {
    if (hasIncome) return [{
      emoji: '💰',
      text: `수입이 들어온 날이에요. 받은 즉시 일부를 저축 계좌로 옮기면, 남은 돈 안에서 소비하는 습관이 자연스럽게 만들어져요.`,
      type: 'praise',
    }]
    return [{ emoji: '✨', text: '지출이 없는 날이에요. 이런 날이 생기는 건 의식적인 절제 덕분이에요. 그냥 넘어가지 않고 인식하는 것 자체가 소비 습관 개선의 시작이에요.', type: 'praise' }]
  }

  const comments: DayComment[] = []

  // 이번 달 일평균 계산 (지출 있는 날 기준, 선택일 제외)
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
  const sameDowEntries = otherDates.filter(([d]) => new Date(d + 'T00:00:00').getDay() === dow)
  const avgDow = sameDowEntries.length >= 2
    ? sameDowEntries.reduce((s, [, v]) => s + v, 0) / sameDowEntries.length
    : null

  // 카테고리별 분석
  const catMap: Record<string, number> = {}
  for (const t of expense) catMap[t.category] = (catMap[t.category] ?? 0) + t.amount
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const topCat = sorted[0]
  const topPct = topCat ? (topCat[1] / dayTotal) * 100 : 0

  // 이번 달 해당 카테고리 일평균
  const catDailyMap: Record<string, Record<string, number>> = {}
  for (const t of allExpenses) {
    if (!catDailyMap[t.category]) catDailyMap[t.category] = {}
    catDailyMap[t.category][t.date] = (catDailyMap[t.category][t.date] ?? 0) + t.amount
  }

  const ratio = avgDaily > 0 ? dayTotal / avgDaily : 0

  // 1. 일평균 대비 고지출 분석
  if (avgDaily > 0 && ratio >= 2) {
    const topCatsStr = sorted.slice(0, 2).map(([c, v]) => `${c} ${w(v)}`).join(', ')
    comments.push({
      emoji: '⚠️',
      text: `이번 달 일평균(${w(avgDaily)})보다 ${ratio.toFixed(1)}배 더 쓴 날이에요. 주요 지출은 ${topCatsStr}이에요. 충동 지출이 있었다면 다음 날 하루 무지출 챌린지로 균형을 맞춰보세요.`,
      type: 'warning',
    })
  } else if (avgDaily > 0 && ratio <= 0.5) {
    const saved = avgDaily - dayTotal
    const monthSaved = saved * 20
    comments.push({
      emoji: '🌟',
      text: `평소(${w(avgDaily)})보다 ${Math.round((1 - ratio) * 100)}% 절약한 날이에요. 매일 이렇게 아끼면 한 달에 약 ${w(monthSaved)}이 추가로 모여요.`,
      type: 'praise',
    })
  }

  // 2. 요일 패턴 인식
  if (avgDow !== null) {
    const dowRatio = dayTotal / avgDow
    if (dowRatio >= 1.7) {
      const topCatOfDow = sorted[0]
      comments.push({
        emoji: '📅',
        text: `${DAY_LABELS[dow]}요일 평균(${w(avgDow)})보다 ${Math.round((dowRatio - 1) * 100)}% 더 썼어요. 최근 ${sameDowEntries.length}번의 ${DAY_LABELS[dow]}요일 중 이번이 가장 높아요. ${topCatOfDow ? `특히 ${topCatOfDow[0]} 지출(${w(topCatOfDow[1])})이 주된 원인이에요.` : ''}`,
        type: 'insight',
      })
    } else if (dowRatio <= 0.6 && dayTotal > 0) {
      comments.push({
        emoji: '📅',
        text: `${DAY_LABELS[dow]}요일 치고 지출이 적은 날이에요. 평소 ${DAY_LABELS[dow]}요일(${w(avgDow)})보다 ${Math.round((1 - dowRatio) * 100)}% 절약했어요.`,
        type: 'praise',
      })
    }
  }

  // 3. 카테고리 집중도 분석
  if (topPct >= 65 && dayTotal >= 15000 && comments.length < 2) {
    const catAvgEntries = catDailyMap[topCat[0]]
      ? Object.entries(catDailyMap[topCat[0]]).filter(([d]) => d !== selectedDate)
      : []
    const catAvg = catAvgEntries.length > 0
      ? catAvgEntries.reduce((s, [, v]) => s + v, 0) / catAvgEntries.length
      : 0
    const catRatioStr = catAvg > 0 ? `, 이 카테고리 일평균(${w(catAvg)})보다 ${Math.round((topCat[1] / catAvg - 1) * 100)}% 높아요` : ''
    comments.push({
      emoji: '🔍',
      text: `오늘 지출의 ${Math.round(topPct)}%인 ${w(topCat[1])}이 ${topCat[0]}에 집중됐어요${catRatioStr}. ${sorted.length > 1 ? `나머지 ${sorted.length - 1}개 항목은 ${w(dayTotal - topCat[1])}이에요.` : ''}`,
      type: 'insight',
    })
  }

  // 4. 행동경제학 팁 (코멘트가 부족할 때 보충)
  if (comments.length === 0 && topCat) {
    const tip = CATEGORY_TIPS[topCat[0]]
    if (tip) comments.push({ emoji: '💡', text: tip, type: 'tip' })
  }

  // 5. 수입+지출 동시인 날 (급여일 등) — 금액 언급 없이 맥락만
  if (hasIncome && dayTotal > 0 && comments.length < 2) {
    comments.push({
      emoji: '📥',
      text: '수입과 지출이 같은 날 발생했어요. 수입이 들어오는 날 지출도 몰리는 패턴이 있다면, 자동이체로 저축을 먼저 챙겨두는 게 효과적이에요.',
      type: 'tip',
    })
  }

  return comments
}

function w(n: number) {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

interface DonutSlice { category: string; amount: number; count: number; color: string; pct: number }

function DonutChart({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const SIZE = 76, CX = 38, CY = 38, R = 26, SW = 11
  const C = 2 * Math.PI * R
  let cum = 0

  return (
    <div className="flex items-center gap-3">
      <svg width={SIZE} height={SIZE} className="shrink-0">
        {/* background ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        {slices.map((s, i) => {
          const arc = C * s.pct
          const offset = -(cum * C)
          cum += s.pct
          return (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={SW}
              strokeDasharray={`${arc} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ filter: `drop-shadow(0 0 3px ${s.color}60)` }}
            />
          )
        })}
        {/* center total */}
        <text x={CX} y={CY - 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
          {total >= 10000 ? `${Math.round(total / 10000)}만` : `${Math.round(total / 1000)}천`}
        </text>
        <text x={CX} y={CY + 7} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7">원</text>
      </svg>

      {/* legend */}
      <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {slices.map(s => (
          <div key={s.category} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.category}</span>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="text-[10px] font-semibold text-white/70">{Math.round(s.pct * 100)}%</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.count}건</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomeExpenseBar({ income, expense }: { income: number; expense: number }) {
  const max = Math.max(income, expense)
  if (max === 0) return null
  const net = income - expense
  return (
    <div className="glass rounded-2xl px-4 py-3 space-y-2.5">
      {income > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-cyan-400">수입</span>
            <span className="text-xs font-bold text-cyan-300">+{income.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(income / max) * 100}%`,
                background: 'linear-gradient(90deg, #0891b2, #22d3ee)',
                boxShadow: '0 0 6px rgba(34,211,238,0.4)',
              }}
            />
          </div>
        </div>
      )}
      {expense > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-rose-400">지출</span>
            <span className="text-xs font-bold text-rose-300">-{expense.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(expense / max) * 100}%`,
                background: 'linear-gradient(90deg, #e11d48, #fb7185)',
                boxShadow: '0 0 6px rgba(251,113,133,0.4)',
              }}
            />
          </div>
        </div>
      )}
      {income > 0 && expense > 0 && (
        <div className="flex justify-end border-t border-white/6 pt-2">
          <span className={`text-[11px] font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {net >= 0 ? '+' : ''}{net.toLocaleString('ko-KR')}원&nbsp;
            <span className="font-normal opacity-60">{net >= 0 ? '잔여' : '초과'}</span>
          </span>
        </div>
      )}
    </div>
  )
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
  customCats, onCatsChange,
  onDelete, onCategoryChange, onBulkCategoryChange, onRecurringChange, onExcludedChange, onBulkExcludedChange, onMetaChange, onAmountChange, onSortOrderChange, onHiddenChange, onDateChange,
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
  const [editState, setEditState] = useState<{
    category: string
    is_recurring: boolean
    is_excluded: boolean
    is_hidden: boolean
    description: string
    memo: string
    amount: string
    date: string
  } | null>(null)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState('')
  const [amountEditId, setAmountEditId] = useState<string | null>(null)
  const [amountEditValue, setAmountEditValue] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [bulkPrompt, setBulkPrompt] = useState<{ keyword: string; category: string; count: number } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [bulkExcludePrompt, setBulkExcludePrompt] = useState<{ keyword: string; count: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [storyCache, setStoryCache] = useState<Record<string, { situation?: string; pattern?: string; tip?: string } | null>>({})
  const [storyLoading, setStoryLoading] = useState(false)

  const bulkAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bulkPrompt) {
      setTimeout(() => bulkAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
    }
  }, [bulkPrompt])

  // 첫 진입 시 기본 선택 날짜 스토리 로드
  useEffect(() => {
    const dayTxs = transactions.filter(t => t.date === selectedDate)
    if (dayTxs.some(t => t.type === 'expense' && !t.is_excluded)) {
      fetchStory(selectedDate, dayTxs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const allSelectedTxs = useMemo(() => {
    const txs = transactions.filter(t => t.date === selectedDate)
    return [...txs].sort((a, b) => {
      const ao = a.sort_order, bo = b.sort_order
      if (ao !== bo) return ao - bo
      return a.created_at.localeCompare(b.created_at)
    })
  }, [transactions, selectedDate])

  const selectedTxs = useMemo(
    () => showHidden ? allSelectedTxs : allSelectedTxs.filter(t => !t.is_hidden),
    [allSelectedTxs, showHidden],
  )
  const hiddenCount = useMemo(() => allSelectedTxs.filter(t => t.is_hidden).length, [allSelectedTxs])
  const selectedExpense = selectedTxs.filter(t => t.type === 'expense' && !t.is_excluded).reduce((s, t) => s + t.amount, 0)
  const selectedIncome = selectedTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const dayInsights = useMemo(
    () => getDayInsights(selectedDate, selectedTxs, transactions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, transactions],
  )

  function getCatColor(name: string) {
    const custom = customCats.find(c => c.name === name)
    return getCategoryColor(name, custom?.color)
  }

  const donutSlices = useMemo(() => {
    const expense = selectedTxs.filter(t => t.type === 'expense' && !t.is_excluded)
    if (expense.length === 0) return []
    const catMap: Record<string, { amount: number; count: number }> = {}
    for (const t of expense) {
      if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 }
      catMap[t.category].amount += t.amount
      catMap[t.category].count += 1
    }
    const total = Object.values(catMap).reduce((s, v) => s + v.amount, 0)
    const customColorMap = Object.fromEntries(customCats.map(c => [c.name, c.color]))
    return Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([category, { amount, count }]) => ({
        category, amount, count,
        color: getCategoryColor(category, customColorMap[category]).dot,
        pct: amount / total,
      }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTxs, customCats])

  async function fetchStory(date: string, txs: Transaction[]) {
    const expense = txs.filter(t => t.type === 'expense' && !t.is_excluded)
    const dayTotal = expense.reduce((s, t) => s + t.amount, 0)
    if (dayTotal === 0) return

    // 카테고리별 집계
    const catMap: Record<string, { amount: number; count: number }> = {}
    for (const t of expense) {
      if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 }
      catMap[t.category].amount += t.amount
      catMap[t.category].count += 1
    }
    const categories = Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([category, { amount, count }]) => ({ category, amount, count }))

    // 일평균, 요일 평균 계산
    const allExpenses = transactions.filter(t => t.type === 'expense' && !t.is_excluded)
    const expenseByDate: Record<string, number> = {}
    for (const t of allExpenses) expenseByDate[t.date] = (expenseByDate[t.date] ?? 0) + t.amount
    const otherDates = Object.entries(expenseByDate).filter(([d]) => d !== date)
    const avgDaily = otherDates.length > 0
      ? otherDates.reduce((s, [, v]) => s + v, 0) / otherDates.length
      : null
    const dow = new Date(date + 'T00:00:00').getDay()
    const sameDow = otherDates.filter(([d]) => new Date(d + 'T00:00:00').getDay() === dow)
    const avgDow = sameDow.length >= 2
      ? sameDow.reduce((s, [, v]) => s + v, 0) / sameDow.length
      : null

    setStoryLoading(true)
    try {
      const res = await fetch('/api/day-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, categories, dayTotal, avgDaily, dow, avgDow }),
      })
      const { story } = await res.json() as { story: { situation?: string; pattern?: string; tip?: string } | null }
      setStoryCache(prev => ({ ...prev, [date]: story }))
    } finally {
      setStoryLoading(false)
    }
  }

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditState({
      category: tx.category,
      is_recurring: tx.is_recurring,
      is_excluded: tx.is_excluded,
      is_hidden: tx.is_hidden,
      description: tx.description ?? '',
      memo: tx.memo ?? '',
      amount: String(tx.amount),
      date: tx.date,
    })
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
      if (editState.is_hidden !== tx.is_hidden) {
        promises.push(updateTransactionHidden(tx.id, editState.is_hidden))
        onHiddenChange(tx.id, editState.is_hidden)
      }
      const newAmount = Number(editState.amount)
      if (!isNaN(newAmount) && newAmount > 0 && newAmount !== tx.amount) {
        promises.push(updateTransactionAmount(tx.id, newAmount))
        onAmountChange(tx.id, newAmount)
      }
      const newDesc = editState.description.trim() || null
      const newMemo = editState.memo.trim() || null
      if (newDesc !== tx.description || newMemo !== (tx.memo ?? null)) {
        promises.push(updateTransactionMeta(tx.id, { description: newDesc, memo: newMemo }))
        onMetaChange(tx.id, newDesc, newMemo)
      }
      if (editState.date !== tx.date) {
        promises.push(updateTransactionDate(tx.id, editState.date))
        onDateChange(tx.id, editState.date)
        setSelectedDate(editState.date)
      }
      await Promise.all(promises)

      if (editState.category !== tx.category && tx.description) {
        const keyword = tx.description.trim()
        const same = transactions.filter(t => t.id !== tx.id && t.description?.includes(keyword) && t.category !== editState.category)
        if (same.length > 0) setBulkPrompt({ keyword, category: editState.category, count: same.length })
      }

      // 항목 제외로 변경됐을 때 — 같은 설명어의 다른 항목들도 제외할지 묻기
      if (editState.is_excluded && !tx.is_excluded && tx.description?.trim()) {
        const keyword = tx.description.trim()
        const same = transactions.filter(t => t.id !== tx.id && !t.is_excluded && t.description?.includes(keyword))
        if (same.length > 0) setBulkExcludePrompt({ keyword, count: same.length })
      }

      setEditingId(null)
      setEditState(null)
    } finally {
      setSaving(false)
    }
  }

  async function moveItem(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= selectedTxs.length) return
    // 현재 순서 배열을 복사 후 swap
    const reordered = [...selectedTxs]
    const tmp = reordered[index]
    reordered[index] = reordered[next]
    reordered[next] = tmp
    // 전체 재할당 (10, 20, 30 ...) — 항상 깔끔한 상태 유지
    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: (i + 1) * 10 }))
    onSortOrderChange(updates)
    await updateTransactionSortOrders(updates)
  }

  async function saveInlineEdit(tx: Transaction) {
    const newDesc = inlineEditValue.trim() || null
    if (newDesc !== tx.description) {
      await updateTransactionMeta(tx.id, { description: newDesc })
      onMetaChange(tx.id, newDesc, tx.memo ?? null)
    }
    setInlineEditId(null)
  }

  async function saveAmountEdit(tx: Transaction) {
    const newAmount = Number(amountEditValue.replace(/,/g, ''))
    if (!isNaN(newAmount) && newAmount > 0 && newAmount !== tx.amount) {
      await updateTransactionAmount(tx.id, newAmount)
      onAmountChange(tx.id, newAmount)
    }
    setAmountEditId(null)
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

  async function handleBulkExclude(scope: 'current_month' | 'all') {
    if (!bulkExcludePrompt) return
    const updatedIds = await excludeTransactionsByKeyword(bulkExcludePrompt.keyword, scope, year, month)
    onBulkExcludedChange(updatedIds)
    setBulkExcludePrompt(null)
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
                onClick={() => {
                  setSelectedDate(ds)
                  setEditingId(null)
                  setEditState(null)
                  // 캐시에 없을 때만 AI 호출
                  if (!(ds in storyCache)) {
                    const dayTxs = transactions.filter(t => t.date === ds)
                    fetchStory(ds, dayTxs)
                  }
                }}
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
        {selectedTxs.length > 1 && (
          <button
            onClick={() => setReorderMode(r => !r)}
            className={`text-xs px-2 py-0.5 rounded-full transition-all ${
              reorderMode
                ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400/30'
                : 'glass-sm text-white/40 hover:text-white/70'
            }`}
          >
            순서
          </button>
        )}
      </div>

      {/* 수입 / 지출 바 차트 */}
      <IncomeExpenseBar income={selectedIncome} expense={selectedExpense} />

      {/* 도넛 차트 */}
      {donutSlices.length > 1 && (
        <div className="glass rounded-2xl px-4 py-3">
          <DonutChart slices={donutSlices} total={selectedExpense} />
        </div>
      )}

      {/* AI 스토리텔링 카드 */}
      {storyLoading ? (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          {[0.8, 0.6, 0.7].map((w, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
              <div className="w-4 h-4 rounded-full shimmer shrink-0" />
              <div className="h-2.5 rounded-full shimmer" style={{ width: `${w * 100}%` }} />
            </div>
          ))}
        </div>
      ) : storyCache[selectedDate] ? (() => {
        const s = storyCache[selectedDate]!
        const rows = [
          { key: 'situation', emoji: '🌤', text: s.situation },
          { key: 'pattern',   emoji: '🔎', text: s.pattern },
          { key: 'tip',       emoji: '💡', text: s.tip },
        ].filter(r => r.text)
        if (!rows.length) return null
        return (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
            {rows.map((row, i) => (
              <div key={row.key}
                className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/6' : ''}`}
              >
                <span className="text-sm shrink-0 mt-0.5">{row.emoji}</span>
                <p className="text-xs text-indigo-200 leading-relaxed">{row.text}</p>
              </div>
            ))}
          </div>
        )
      })() : null}

      {/* 패턴 분석 코멘트 */}
      {dayInsights.map((insight, i) => {
        const s = COMMENT_STYLE[insight.type]
        return (
          <div
            key={i}
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <span className="text-base shrink-0 mt-0.5">{insight.emoji}</span>
            <p className={`text-xs leading-relaxed ${s.text}`}>{insight.text}</p>
          </div>
        )
      })}

      {/* 해당 날짜 거래 목록 */}
      {selectedTxs.length === 0 ? (
        <div className="glass rounded-2xl py-10 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>이 날은 내역이 없어요</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {selectedTxs.map((tx, txIndex) => {
            const isEditing = editingId === tx.id
            const cc = getCatColor(tx.category)
            const hasChanged = editState
              ? editState.category !== tx.category
                || editState.is_recurring !== tx.is_recurring
                || editState.is_excluded !== tx.is_excluded
                || editState.is_hidden !== tx.is_hidden
                || editState.description !== (tx.description ?? '')
                || editState.memo !== (tx.memo ?? '')
                || Number(editState.amount) !== tx.amount
                || editState.date !== tx.date
              : false

            return (
              <div key={tx.id} className={`px-4 py-3 group transition-colors flex gap-2 ${tx.is_excluded || tx.is_hidden ? 'opacity-50' : ''}`}>
                {/* 순서 변경 버튼 */}
                {reorderMode && !isEditing && (
                  <div className="flex flex-col justify-center gap-0.5 shrink-0">
                    <button
                      onClick={() => moveItem(txIndex, -1)}
                      disabled={txIndex === 0}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors text-xs glass-sm"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveItem(txIndex, 1)}
                      disabled={txIndex === selectedTxs.length - 1}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors text-xs glass-sm"
                    >
                      ↓
                    </button>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                {isEditing && editState ? (
                  <div className="space-y-2.5">
                    {/* 날짜 편집 */}
                    <input
                      type="date"
                      value={editState.date}
                      onChange={e => setEditState(s => s ? { ...s, date: e.target.value } : s)}
                      className="w-full glass-sm rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{ colorScheme: 'dark' }}
                    />
                    {/* 금액 편집 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editState.amount}
                        onChange={e => setEditState(s => s ? { ...s, amount: e.target.value } : s)}
                        placeholder="금액"
                        className="flex-1 glass-sm rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      />
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>원</span>
                    </div>
                    {/* 내역 이름 편집 */}
                    <input
                      type="text"
                      value={editState.description}
                      onChange={e => setEditState(s => s ? { ...s, description: e.target.value } : s)}
                      placeholder="내역 이름"
                      className="w-full glass-sm rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    {/* 메모 */}
                    <input
                      type="text"
                      value={editState.memo}
                      onChange={e => setEditState(s => s ? { ...s, memo: e.target.value } : s)}
                      placeholder="메모 (선택)"
                      className="w-full glass-sm rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    <CategoryPicker
                      type={tx.type}
                      selected={editState.category}
                      onChange={c => setEditState(s => s ? { ...s, category: c } : s)}
                      externalCats={customCats}
                      onCatsChange={onCatsChange}
                    />
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
                        {editState.is_excluded ? '항목 제외 ✓' : '항목 제외'}
                      </button>
                      <button
                        onClick={() => setEditState(s => s ? { ...s, is_hidden: !s.is_hidden } : s)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                          editState.is_hidden
                            ? 'bg-violet-500/25 text-violet-300 ring-1 ring-violet-400/20 font-semibold'
                            : 'glass-sm text-white/45 hover:text-white/80'
                        }`}
                      >
                        {editState.is_hidden ? '🙈 숨김 ✓' : '숨김'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(tx)}
                        disabled={saving || !hasChanged}
                        className="text-xs px-3 py-1 rounded-full font-semibold transition-all disabled:opacity-30"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white' }}
                      >
                        {saving ? '저장 중…' : '저장'}
                      </button>
                      <button onClick={cancelEdit} className="text-xs px-2 py-0.5 rounded-full glass-sm text-white/40">
                        취소
                      </button>
                      <button
                        onClick={() => { cancelEdit(); setConfirmDeleteId(tx.id) }}
                        className="text-xs px-2 py-0.5 rounded-full glass-sm text-rose-400 hover:bg-rose-500/15 transition-colors ml-auto"
                      >
                        삭제
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
                          <span className="text-xs bg-zinc-500/20 text-zinc-400 px-1.5 py-0.5 rounded-full shrink-0">항목 제외</span>
                        )}
                        {tx.is_hidden && (
                          <span className="text-xs bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full shrink-0">숨김</span>
                        )}
                        {tx.payment_method && (
                          <span className="text-xs glass-sm px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {tx.payment_method}
                          </span>
                        )}
                      </div>
                      {inlineEditId === tx.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={inlineEditValue}
                          onChange={e => setInlineEditValue(e.target.value)}
                          onBlur={() => saveInlineEdit(tx)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveInlineEdit(tx) }
                            if (e.key === 'Escape') setInlineEditId(null)
                          }}
                          className="mt-1 w-full glass-sm rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                        />
                      ) : (
                        <p
                          className="text-sm font-medium mt-1 truncate text-white/80 cursor-text select-text"
                          onDoubleClick={() => {
                            setInlineEditId(tx.id)
                            setInlineEditValue(tx.description ?? '')
                          }}
                          title="더블클릭하여 수정"
                        >
                          {tx.description ?? <span className="text-white/25 text-xs">더블클릭하여 이름 입력</span>}
                        </p>
                      )}
                      {tx.memo && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          📝 {tx.memo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {amountEditId === tx.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={amountEditValue}
                          onChange={e => setAmountEditValue(e.target.value)}
                          onBlur={() => saveAmountEdit(tx)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveAmountEdit(tx) }
                            if (e.key === 'Escape') setAmountEditId(null)
                          }}
                          className="w-24 text-right glass-sm rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                        />
                      ) : (
                        <span
                          className={`text-sm font-bold cursor-pointer select-none ${
                            tx.is_excluded ? 'text-white/35 line-through' :
                            tx.type === 'income' ? 'text-cyan-300' : 'text-rose-300'
                          }`}
                          onDoubleClick={() => {
                            setAmountEditId(tx.id)
                            setAmountEditValue(String(tx.amount))
                          }}
                          title="더블클릭하여 금액 수정"
                        >
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ko-KR')}
                          <span className="text-xs font-normal ml-0.5 opacity-50">원</span>
                        </span>
                      )}
                      <button
                        onClick={() => setConfirmDeleteId(tx.id)}
                        className="text-white/20 hover:text-rose-400 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 숨긴 항목 토글 */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowHidden(v => !v)}
          className="w-full py-2 text-xs rounded-xl glass-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {showHidden ? `🙈 숨긴 항목 ${hiddenCount}개 숨기기` : `🙈 숨긴 항목 ${hiddenCount}개 보기`}
        </button>
      )}

      {/* 일괄 카테고리 변경 프롬프트 */}
      <div ref={bulkAnchorRef} />
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

      {/* 일괄 항목 제외 프롬프트 */}
      {bulkExcludePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4" onClick={() => setBulkExcludePrompt(null)}>
          <div className="glass rounded-2xl p-6 w-full sm:max-w-sm space-y-4" onClick={e => e.stopPropagation()}
            style={{ border: '1px solid rgba(113,113,122,0.35)' }}>
            <div>
              <p className="text-sm font-semibold text-white mb-1">일괄 항목 제외</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-white font-medium">"{bulkExcludePrompt.keyword}"</span>이 포함된 항목{' '}
                <span className="text-zinc-300 font-semibold">{bulkExcludePrompt.count}건</span>도 함께 지출 분석에서 제외할까요?
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleBulkExclude('current_month')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #52525b, #3f3f46)' }}
              >
                이번 달 {bulkExcludePrompt.count}건 모두 제외
              </button>
              <button
                onClick={() => handleBulkExclude('all')}
                className="w-full py-2.5 rounded-xl text-sm font-medium glass-sm text-white/70 hover:text-white transition-colors"
              >
                전체 기간 모두 제외
              </button>
              <button
                onClick={() => setBulkExcludePrompt(null)}
                className="w-full py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                현재 항목만 제외
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
