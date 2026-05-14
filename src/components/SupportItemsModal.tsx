'use client'

import { useState, useEffect } from 'react'
import { type SupportItem, type SupportAllocation, addSupportItem, deleteSupportItem, getMonthAllocations, addAllocation, deleteAllocation } from '@/lib/supportItems'
import { Transaction } from '@/lib/types'

interface Props {
  items: SupportItem[]
  year: number
  month: number
  transactions: Transaction[]
  onAdd: (item: SupportItem) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function SupportItemsModal({ items, year, month, transactions, onAdd, onDelete, onClose }: Props) {
  const defaultDate = `${year}-${String(month).padStart(2, '0')}-01`
  const [sourceName, setSourceName] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [allocations, setAllocations] = useState<SupportAllocation[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingTxId, setTogglingTxId] = useState<string | null>(null)

  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const total = items.reduce((s, i) => s + i.amount, 0)

  useEffect(() => {
    if (items.length === 0) return
    getMonthAllocations(items.map(i => i.id)).then(setAllocations).catch(() => {})
  }, [items])

  function getAllocsFor(itemId: string) {
    return allocations.filter(a => a.support_item_id === itemId)
  }

  function getUsedAmount(itemId: string) {
    return getAllocsFor(itemId).reduce((s, a) => {
      const tx = transactions.find(t => t.id === a.transaction_id)
      return s + (tx?.amount ?? 0)
    }, 0)
  }

  async function handleAdd() {
    const parsed = parseInt(amount.replace(/,/g, ''), 10)
    if (!sourceName.trim() || isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    setError(null)
    try {
      await addSupportItem({ source_name: sourceName.trim(), amount: parsed, category: '지원', date, purpose: purpose.trim() || undefined })
      onAdd({
        id: crypto.randomUUID(),
        transaction_id: null,
        source_name: sourceName.trim(),
        amount: parsed,
        category: '지원',
        date,
        created_at: new Date().toISOString(),
        purpose: purpose.trim() || null,
      })
      setSourceName('')
      setAmount('')
      setPurpose('')
      setDate(defaultDate)
    } catch {
      setError('추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteSupportItem(id)
      onDelete(id)
      if (expandedId === id) setExpandedId(null)
      setAllocations(prev => prev.filter(a => a.support_item_id !== id))
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleTx(supportItemId: string, tx: Transaction) {
    const itemAllocs = getAllocsFor(supportItemId)
    const existing = itemAllocs.find(a => a.transaction_id === tx.id)
    setTogglingTxId(tx.id)
    setError(null)
    try {
      if (existing) {
        await deleteAllocation(existing.id)
        setAllocations(prev => prev.filter(a => a.id !== existing.id))
      } else {
        const alloc = await addAllocation(supportItemId, tx.id)
        setAllocations(prev => [...prev, alloc])
      }
    } catch {
      setError(existing ? '연결 해제에 실패했습니다.' : '연결에 실패했습니다.')
    } finally {
      setTogglingTxId(null)
    }
  }

  const expenseTransactions = transactions
    .filter(t => t.type === 'expense' && !t.is_excluded && !t.is_hidden)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: 'rgba(15,15,30,0.98)', border: '1px solid rgba(250,204,21,0.2)', borderBottom: 'none', maxHeight: '90vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span>🤝</span>
              <h2 className="text-base font-bold text-white">{month}월 지원금</h2>
            </div>
            <p className="text-xs mt-0.5 text-yellow-300 font-semibold">총 {fmt(total)}원</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>등록된 지원금 내역이 없습니다</p>
          ) : (
            items.map(item => {
              const d = new Date(item.date + 'T00:00:00')
              const isExpanded = expandedId === item.id
              const itemAllocs = getAllocsFor(item.id)
              const used = getUsedAmount(item.id)
              const remaining = item.amount - used
              const usedPct = Math.min(100, item.amount > 0 ? Math.round((used / item.amount) * 100) : 0)
              const linkedCount = itemAllocs.length

              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
                >
                  {/* 카드 헤더 */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <button className="flex-1 text-left min-w-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{item.source_name ?? '(출처 없음)'}</p>
                          <span className="text-white/25 text-xs">{isExpanded ? '∧' : '∨'}</span>
                          {linkedCount > 0 && (
                            <span className="text-xs text-yellow-400/60">{linkedCount}건 연결됨</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {d.getMonth() + 1}월 {d.getDate()}일
                          {item.purpose && <span className="ml-1.5 text-yellow-400/70">· {item.purpose}</span>}
                        </p>
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-yellow-300">{fmt(item.amount)}원</p>
                        <p className={`text-xs font-medium ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          잔액 {fmt(remaining)}원
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-white/20 hover:text-rose-400 transition-colors text-lg leading-none disabled:opacity-40 ml-1 shrink-0"
                      >
                        {deletingId === item.id ? '…' : '×'}
                      </button>
                    </div>

                    {/* 잔액 프로그레스 바 */}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${usedPct}%`,
                          background: usedPct >= 100 ? '#f87171' : usedPct >= 80 ? '#fb923c' : '#4ade80',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>사용 {fmt(used)}원</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{usedPct}%</p>
                    </div>
                  </div>

                  {/* 확장 — 체크박스 지출 목록 */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-white/40">지출 연결</p>
                        {linkedCount > 0 && (
                          <p className="text-xs text-yellow-400/60">{linkedCount}건 · {fmt(used)}원</p>
                        )}
                      </div>
                      {expenseTransactions.length === 0 ? (
                        <p className="text-xs text-center px-4 pb-3" style={{ color: 'var(--text-muted)' }}>이번 달 지출 내역이 없습니다</p>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {expenseTransactions.map(tx => {
                            const isChecked = itemAllocs.some(a => a.transaction_id === tx.id)
                            const isToggling = togglingTxId === tx.id
                            const txDate = new Date(tx.date + 'T00:00:00')
                            return (
                              <button
                                key={tx.id}
                                onClick={() => !isToggling && handleToggleTx(item.id, tx)}
                                disabled={isToggling}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-60"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                              >
                                {/* 체크박스 */}
                                <div
                                  className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                                  style={{
                                    background: isChecked ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.06)',
                                    border: isChecked ? '1.5px solid rgba(250,204,21,0.7)' : '1.5px solid rgba(255,255,255,0.15)',
                                  }}
                                >
                                  {isToggling ? (
                                    <span className="text-xs text-yellow-400 animate-pulse">·</span>
                                  ) : isChecked ? (
                                    <span className="text-yellow-300 text-xs font-bold">✓</span>
                                  ) : null}
                                </div>

                                {/* 날짜 */}
                                <span className="text-xs shrink-0 w-8" style={{ color: 'var(--text-muted)' }}>
                                  {txDate.getMonth() + 1}/{txDate.getDate()}
                                </span>

                                {/* 내용 */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium truncate ${isChecked ? 'text-white/90' : 'text-white/55'}`}>
                                    {tx.description || tx.category}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.category}</p>
                                </div>

                                {/* 금액 */}
                                <span className={`text-xs font-semibold shrink-0 ${isChecked ? 'text-yellow-300' : 'text-white/40'}`}>
                                  {fmt(tx.amount)}원
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 추가 폼 */}
        <div className="px-5 pb-8 pt-3 space-y-2.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-white/50">직접 추가</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="출처 (예: 엄마, 친구)"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              type="number"
              placeholder="금액"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-28 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <input
            type="text"
            placeholder="용도 (예: 식비로 쓸 것)"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={saving || !sourceName.trim() || !amount}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
          >
            {saving ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
