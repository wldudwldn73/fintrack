'use client'

import { useState, useRef } from 'react'
import XLSXStyle from 'xlsx-js-style'
import { parseTossFile, ParseResult } from '@/lib/parseTossFile'
import { TransactionInsert, RECURRING_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getTransactionsByDateRange, getAllTransactions } from '@/lib/transactions'
import { getCategoryColor } from '@/lib/categoryColors'
import { type CustomCat } from '@/components/CategoryPicker'

interface Props {
  onImport: (transactions: TransactionInsert[]) => Promise<void>
  onClose: () => void
  customCats?: CustomCat[]
}

async function downloadAllTransactions() {
  const all = await getAllTransactions()
  if (all.length === 0) return

  const HEADER_BG  = '312E81'  // indigo-950
  const HEADER_FG  = 'FFFFFF'
  const ROW_EVEN   = 'EEF2FF'  // indigo-50
  const INCOME_FG  = '0E7490'  // cyan-700
  const EXPENSE_FG = 'BE123C'  // rose-700
  const BORDER     = { style: 'thin' as const, color: { rgb: 'C7D2FE' } }
  const COLS = ['날짜', '거래내용', '출금금액', '입금금액', '카테고리', '메모', '결제수단', '고정지출']
  const COL_KEYS   = 'ABCDEFGH'.split('')
  const COL_WIDTHS = [12, 28, 13, 13, 11, 22, 18, 8]

  const ws: Record<string, unknown> = {}

  // 헤더 행
  COLS.forEach((label, ci) => {
    const ref = `${COL_KEYS[ci]}1`
    ws[ref] = {
      v: label, t: 's',
      s: {
        fill: { fgColor: { rgb: HEADER_BG } },
        font: { bold: true, color: { rgb: HEADER_FG }, sz: 10, name: '맑은 고딕' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
      },
    }
  })

  // 데이터 행
  all.forEach((t, ri) => {
    const rowNum = ri + 2
    const isEven = ri % 2 === 0
    const bgRgb = isEven ? ROW_EVEN : 'FFFFFF'

    const values: (string | number)[] = [
      t.date,
      t.description ?? '',
      t.type === 'expense' ? t.amount : '',
      t.type === 'income' ? t.amount : '',
      t.category,
      t.memo ?? '',
      t.payment_method ?? '',
      t.is_recurring ? 'Y' : '',
    ]

    values.forEach((v, ci) => {
      const ref = `${COL_KEYS[ci]}${rowNum}`
      const isAmountCol = ci === 2 || ci === 3
      const isExpenseAmt = ci === 2 && typeof v === 'number'
      const isIncomeAmt  = ci === 3 && typeof v === 'number'
      ws[ref] = {
        v, t: typeof v === 'number' ? 'n' : 's',
        s: {
          fill: { fgColor: { rgb: bgRgb } },
          font: {
            sz: 10,
            name: '맑은 고딕',
            color: { rgb: isExpenseAmt ? EXPENSE_FG : isIncomeAmt ? INCOME_FG : '1E293B' },
            bold: isAmountCol && v !== '',
          },
          alignment: {
            horizontal: isAmountCol ? 'right' : 'left',
            vertical: 'center',
          },
          numFmt: isAmountCol && v !== '' ? '#,##0' : undefined,
          border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
        },
      }
    })
  })

  const lastRow = all.length + 1
  ws['!ref'] = `A1:H${lastRow}`
  ws['!cols'] = COL_WIDTHS.map(wch => ({ wch }))
  ws['!rows'] = [{ hpt: 22 }, ...Array(all.length).fill({ hpt: 18 })]

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws as XLSXStyle.WorkSheet, '거래내역')
  XLSXStyle.writeFile(wb, `fintrack_내역_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function CsvImport({ onImport, onClose, customCats = [] }: Props) {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [transferIndices, setTransferIndices] = useState<Set<number>>(new Set())
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())
  const [recurringIndices, setRecurringIndices] = useState<Set<number>>(new Set())
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null)
  const [bulkCatPrompt, setBulkCatPrompt] = useState<{ keyword: string; category: string; indices: number[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)
    setExcluded(new Set())
    setTransferIndices(new Set())
    setDuplicateIndices(new Set())
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

          // 완전 중복: 같은 날짜 + 금액 + 방향 + 내역
          const exactKeys = new Set(existing.map(e => `${e.date}|${e.amount}|${e.type}|${e.description ?? ''}`))
          const duplicates = new Set<number>()
          parsed.transactions.forEach((t, i) => {
            if (exactKeys.has(`${t.date}|${t.amount}|${t.type}|${t.description ?? ''}`)) duplicates.add(i)
          })
          setDuplicateIndices(duplicates)

          // 이체: 같은 날짜 + 금액 + 반대 방향
          const existingKeys = new Set(existing.map(e => `${e.date}|${e.amount}|${e.type}`))
          const transfers = new Set<number>()
          parsed.transactions.forEach((t, i) => {
            const oppositeType = t.type === 'expense' ? 'income' : 'expense'
            if (existingKeys.has(`${t.date}|${t.amount}|${oppositeType}`)) transfers.add(i)
          })
          setTransferIndices(transfers)
          setExcluded(new Set([...duplicates, ...transfers]))

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
    if (!result) return
    const keyword = result.transactions[idx].description?.trim() ?? ''

    setResult(prev => prev ? {
      ...prev,
      transactions: prev.transactions.map((t, i) =>
        i === idx ? { ...t, category, is_recurring: RECURRING_CATEGORIES.has(category) } : t
      )
    } : null)
    setEditingCategoryIdx(null)

    // 같은 거래처 다른 항목 존재 시 일괄 변경 프롬프트
    if (keyword) {
      const matchingIndices = result.transactions
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => i !== idx && t.description?.trim() === keyword && t.category !== category)
        .map(({ i }) => i)
      if (matchingIndices.length > 0) setBulkCatPrompt({ keyword, category, indices: matchingIndices })
    }
  }

  function applyBulkCategory() {
    if (!bulkCatPrompt) return
    const { indices, category } = bulkCatPrompt
    setResult(prev => prev ? {
      ...prev,
      transactions: prev.transactions.map((t, i) =>
        indices.includes(i) ? { ...t, category, is_recurring: RECURRING_CATEGORIES.has(category) } : t
      )
    } : null)
    setBulkCatPrompt(null)
  }

  function toggleRecurring(idx: number) {
    setResult(prev => prev ? {
      ...prev,
      transactions: prev.transactions.map((t, i) =>
        i === idx ? { ...t, is_recurring: !t.is_recurring } : t
      )
    } : null)
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

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAllTransactions()
    } finally {
      setExporting(false)
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
                const isDuplicate = duplicateIndices.has(i)
                return (
                  <div
                    key={i}
                    onClick={() => !isDuplicate && toggleExclude(i)}
                    className={`flex items-center justify-between text-sm px-3 py-2.5 rounded-lg select-none transition-colors ${isDuplicate ? 'opacity-30 bg-gray-50 cursor-not-allowed' : isExcluded ? 'opacity-35 bg-gray-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isDuplicate || isExcluded ? 'border-gray-300 bg-white' : 'border-gray-800 bg-gray-800'}`}>
                        {!isDuplicate && !isExcluded && <span className="text-white text-[10px] leading-none">✓</span>}
                      </div>
                      <div className="min-w-0 flex-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-400 shrink-0">{tx.date}</span>
                          {duplicateIndices.has(i) ? (
                            <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full shrink-0">중복</span>
                          ) : transferIndices.has(i) ? (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">이체</span>
                          ) : editingCategoryIdx === i ? (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {[
                                ...(tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
                                ...customCats.filter(c => c.type === tx.type).map(c => c.name),
                              ].map(c => {
                                const custom = customCats.find(cc => cc.name === c)
                                const cc = getCategoryColor(c, custom?.color)
                                return (
                                  <button
                                    key={c}
                                    onClick={() => changeCategory(i, c)}
                                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${tx.category === c ? `${cc.bg} ${cc.text} font-semibold` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                  >
                                    {c}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            (() => {
                              const custom = customCats.find(cc => cc.name === tx.category)
                              const cc = getCategoryColor(tx.category, custom?.color)
                              return (
                                <button
                                  onClick={() => setEditingCategoryIdx(i)}
                                  className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 hover:opacity-80 ${cc.bg} ${cc.text}`}
                                >
                                  {tx.category} ✎
                                </button>
                              )
                            })()
                          )}
                          {!transferIndices.has(i) && !duplicateIndices.has(i) && editingCategoryIdx !== i && (
                            <button
                              onClick={e => { e.stopPropagation(); toggleRecurring(i) }}
                              className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 transition-colors ${
                                tx.is_recurring
                                  ? 'bg-orange-100 text-orange-600 font-medium'
                                  : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'
                              }`}
                            >
                              {tx.is_recurring ? '고정 ✓' : '고정'}
                            </button>
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

            {/* 일괄 카테고리 변경 프롬프트 */}
            {bulkCatPrompt && (
              <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-xs text-blue-700 mb-2.5">
                  <span className="font-semibold">"{bulkCatPrompt.keyword}"</span> 항목이{' '}
                  <span className="font-semibold text-blue-800">{bulkCatPrompt.indices.length}건</span> 더 있어요.
                  모두 <span className="font-semibold">{bulkCatPrompt.category}</span>로 변경할까요?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={applyBulkCategory}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {bulkCatPrompt.indices.length}건 모두 변경
                  </button>
                  <button
                    onClick={() => setBulkCatPrompt(null)}
                    className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
                  >
                    이것만
                  </button>
                </div>
              </div>
            )}

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
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-50"
            >
              {exporting ? '내보내는 중...' : '📤 내역 내보내기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
