'use client'

import { useState, useRef } from 'react'
import { parseTossFile, ParseResult } from '@/lib/parseTossFile'
import { TransactionInsert, RECURRING_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getTransactionsByDateRange } from '@/lib/transactions'

interface Props {
  onImport: (transactions: TransactionInsert[]) => Promise<void>
  onClose: () => void
}

export default function CsvImport({ onImport, onClose }: Props) {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [transferIndices, setTransferIndices] = useState<Set<number>>(new Set())
  const [recurringIndices, setRecurringIndices] = useState<Set<number>>(new Set())
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)
    setExcluded(new Set())
    setTransferIndices(new Set())
    setRecurringIndices(new Set())
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const parsed = parseTossFile(buffer, file.name)
        setResult(parsed)

        setCategorizing(true)
        try {
          const res = await fetch('/api/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: parsed.transactions.map(t => ({
                description: t.description ?? '',
                amount: t.amount,
                type: t.type,
              }))
            })
          })
          const { categories } = await res.json()
          if (Array.isArray(categories)) {
            setResult(prev => prev ? {
              ...prev,
              transactions: prev.transactions.map((t, i) => {
                const cat = categories[i] ?? t.category
                return { ...t, category: cat, is_recurring: RECURRING_CATEGORIES.has(cat) || !!t.is_recurring }
              })
            } : null)
          }
        } catch {}
        setCategorizing(false)

        // 이체 감지 + 고정지출 이력 감지
        try {
          const dates = parsed.transactions.map(t => t.date).sort()
          const existing = await getTransactionsByDateRange(dates[0], dates[dates.length - 1])

          // 이체: 같은 날짜 + 금액 + 반대 방향
          const existingKeys = new Set(existing.map(e => `${e.date}|${e.amount}|${e.type}`))
          const transfers = new Set<number>()
          parsed.transactions.forEach((t, i) => {
            const oppositeType = t.type === 'expense' ? 'income' : 'expense'
            if (existingKeys.has(`${t.date}|${t.amount}|${oppositeType}`)) transfers.add(i)
          })
          setTransferIndices(transfers)
          setExcluded(transfers)

          // 고정지출: 이전 달에도 같은 description이 존재하면 반복 지출로 판단
          const existingDescMonths: Record<string, Set<string>> = {}
          for (const e of existing) {
            if (!e.description) continue
            const key = e.description.trim()
            if (!existingDescMonths[key]) existingDescMonths[key] = new Set()
            existingDescMonths[key].add(e.date.slice(0, 7))
          }
          const recurring = new Set<number>()
          setResult(prev => {
            if (!prev) return null
            return {
              ...prev,
              transactions: prev.transactions.map((t, i) => {
                const desc = t.description?.trim() ?? ''
                const historyMonths = existingDescMonths[desc]
                const fromHistory = !!historyMonths && historyMonths.size >= 1
                const isRec = RECURRING_CATEGORIES.has(t.category) || fromHistory
                if (isRec) recurring.add(i)
                return { ...t, is_recurring: isRec }
              })
            }
          })
          setRecurringIndices(recurring)
        } catch {}
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 파싱 실패')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleExclude(i: number) {
    setExcluded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function changeCategory(idx: number, category: string) {
    setResult(prev => prev ? {
      ...prev,
      transactions: prev.transactions.map((t, i) =>
        i === idx ? { ...t, category, is_recurring: RECURRING_CATEGORIES.has(category) } : t
      )
    } : null)
    setEditingCategoryIdx(null)
  }

  async function handleImport() {
    if (!result) return
    setLoading(true)
    try {
      const selected = result.transactions.filter((_, i) => !excluded.has(i))
      await onImport(selected)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const selectedCount = result ? result.transactions.length - excluded.size : 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-6 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">거래내역 가져오기</h3>
        <p className="text-xs text-gray-400 mb-5">국민은행, 토스 등 앱에서 내보낸 거래내역 파일을 업로드하세요</p>

        {!result && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p className="text-sm text-gray-500">파일을 드래그하거나 클릭해서 선택</p>
            <p className="text-xs text-gray-400 mt-1">.csv, .xls, .xlsx 지원</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {result && (
          <>
            <div className="flex items-center mb-3">
              <span className="text-sm text-gray-500">
                {categorizing ? '✦ AI가 카테고리 분류 중...' : '제외할 항목을 탭해서 선택 해제하세요'}
              </span>
              <button onClick={() => setResult(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">다시 선택</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {result.transactions.map((tx, i) => {
                const isExcluded = excluded.has(i)
                return (
                  <div
                    key={i}
                    onClick={() => toggleExclude(i)}
                    className={`flex items-center justify-between text-sm px-3 py-2.5 rounded-lg cursor-pointer select-none transition-colors ${isExcluded ? 'opacity-35 bg-gray-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isExcluded ? 'border-gray-300 bg-white' : 'border-gray-800 bg-gray-800'}`}>
                        {!isExcluded && <span className="text-white text-[10px] leading-none">✓</span>}
                      </div>
                      <div className="min-w-0 flex-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-400 shrink-0">{tx.date}</span>
                          {transferIndices.has(i) ? (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">이체</span>
                          ) : editingCategoryIdx === i ? (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {(tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                <button
                                  key={c}
                                  onClick={() => changeCategory(i, c)}
                                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${tx.category === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingCategoryIdx(i)}
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full shrink-0 hover:bg-gray-200"
                            >
                              {tx.category} ✎
                            </button>
                          )}
                          {recurringIndices.has(i) && !transferIndices.has(i) && editingCategoryIdx !== i && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full shrink-0">고정</span>
                          )}
                          {tx.description && <span className="text-sm text-gray-800 font-medium truncate">{tx.description}</span>}
                        </div>
                        {tx.payment_method && (
                          <span className="text-xs text-gray-400">{tx.payment_method}</span>
                        )}
                      </div>
                    </div>
                    <span className={`ml-2 shrink-0 font-medium ${tx.type === 'income' ? 'text-blue-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">취소</button>
              <button
                onClick={handleImport}
                disabled={loading || selectedCount === 0}
                className="flex-1 py-3 rounded-lg bg-gray-800 text-white text-sm font-medium disabled:opacity-40"
              >
                {loading ? '가져오는 중...' : `${selectedCount}건 가져오기`}
              </button>
            </div>
          </>
        )}

        {!result && !error && (
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">취소</button>
          </div>
        )}
      </div>
    </div>
  )
}
