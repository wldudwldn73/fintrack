'use client'

import { useState } from 'react'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import {
  updateTransactionCategory,
  updateTransactionCategoryByKeyword,
  updateTransactionRecurring,
  updateTransactionExcluded,
  deleteTransaction,
} from '@/lib/transactions'
import { getCategoryColor } from '@/lib/categoryColors'

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

interface EditState {
  category: string
  is_recurring: boolean
  is_excluded: boolean
}

interface BulkPrompt {
  keyword: string
  category: string
  count: number
}

function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`
}

export default function TransactionList({
  transactions, year, month,
  onDelete, onCategoryChange, onBulkCategoryChange, onRecurringChange, onExcludedChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [bulkPrompt, setBulkPrompt] = useState<BulkPrompt | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

      // 카테고리 변경 시 같은 키워드 항목 감지
      if (editState.category !== tx.category && tx.description) {
        const keyword = tx.description.trim()
        const sameKeyword = transactions.filter(
          t => t.id !== tx.id && t.description?.includes(keyword) && t.category !== editState.category
        )
        if (sameKeyword.length > 0) {
          setBulkPrompt({ keyword, category: editState.category, count: sameKeyword.length })
        }
      }

      setEditingId(null)
      setEditState(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleBulk(scope: 'current_month' | 'all') {
    if (!bulkPrompt) return
    const updatedIds = await updateTransactionCategoryByKeyword(
      bulkPrompt.keyword, bulkPrompt.category, scope, year, month,
    )
    onBulkCategoryChange(updatedIds, bulkPrompt.category)
    setBulkPrompt(null)
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    onDelete(id)
    setConfirmDeleteId(null)
  }

  if (transactions.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>이번 달 내역이 없습니다</p>
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <>
      <div className="space-y-5">
        {groups.map(([date, txs]) => {
          const dayTotal = txs
            .filter(t => !t.is_excluded)
            .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0)
          return (
            <div key={date}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(date)}
                </span>
                <span className={`text-xs font-semibold ${dayTotal >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('ko-KR')}원
                </span>
              </div>

              <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
                {txs.map(tx => {
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
                          {/* Category chips */}
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

                          {/* Toggles row */}
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

                          {/* Save / Cancel */}
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
                            <button
                              onClick={cancelEdit}
                              className="text-xs px-2 py-0.5 rounded-full glass-sm text-rose-400"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : confirmDeleteId === tx.id ? (
                        /* Delete confirm */
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
                        /* Normal row */
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
            </div>
          )
        })}
      </div>

      {/* 일괄 카테고리 변경 프롬프트 */}
      {bulkPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4" onClick={() => setBulkPrompt(null)}>
          <div className="glass rounded-2xl p-6 w-full sm:max-w-sm glow-indigo space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-sm font-semibold text-white mb-1">일괄 카테고리 변경</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-white font-medium">"{bulkPrompt.keyword}"</span>이 포함된 항목{' '}
                <span className="text-indigo-300 font-semibold">{bulkPrompt.count}건</span>도{' '}
                <span className={`font-semibold ${getCategoryColor(bulkPrompt.category).text}`}>
                  {bulkPrompt.category}
                </span>로 변경할까요?
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
    </>
  )
}
