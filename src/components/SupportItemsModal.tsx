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
  const [showTxPicker, setShowTxPicker] = useState<string | null>(null)
  const [linkingTxId, setLinkingTxId] = useState<string | null>(null)
  const [deletingAllocId, setDeletingAllocId] = useState<string | null>(null)

  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const total = items.reduce((s, i) => s + i.amount, 0)

  useEffect(() => {
    if (items.length === 0) return
    getMonthAllocations(items.map(i => i.id)).then(setAllocations).catch(() => {})
  }, [items])

  const linkedTxIds = new Set(allocations.map(a => a.transaction_id))

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

  async function handleLinkTx(supportItemId: string, txId: string) {
    setLinkingTxId(txId)
    try {
      const alloc = await addAllocation(supportItemId, txId)
      setAllocations(prev => [...prev, alloc])
      setShowTxPicker(null)
    } catch {
      setError('연결에 실패했습니다.')
    } finally {
      setLinkingTxId(null)
    }
  }

  async function handleUnlinkTx(allocId: string) {
    setDeletingAllocId(allocId)
    try {
      await deleteAllocation(allocId)
      setAllocations(prev => prev.filter(a => a.id !== allocId))
    } catch {
      setError('연결 해제에 실패했습니다.')
    } finally {
      setDeletingAllocId(null)
    }
  }

  const expenseTransactions = transactions.filter(t => t.type === 'expense' && !t.is_excluded && !t.is_hidden)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: 'var(--glass-bg, rgba(15,15,30,0.98))', border: '1px solid rgba(250,204,21,0.2)', borderBottom: 'none', maxHeight: '90vh' }}
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

                  {/* 확장 영역 */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* 연결된 지출 목록 */}
                      {itemAllocs.length === 0 ? (
                        <p className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>연결된 지출이 없습니다</p>
                      ) : (
                        <div className="space-y-1.5">
                          {itemAllocs.map(alloc => {
                            const tx = transactions.find(t => t.id === alloc.transaction_id)
                            if (!tx) return null
                            return (
                              <div key={alloc.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white/80 truncate">{tx.description || tx.category}</p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.category}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                  <span className="text-xs font-semibold text-white/70">{fmt(tx.amount)}원</span>
                                  <button
                                    onClick={() => handleUnlinkTx(alloc.id)}
                                    disabled={deletingAllocId === alloc.id}
                                    className="text-white/20 hover:text-rose-400 transition-colors text-base leading-none disabled:opacity-40"
                                  >
                                    {deletingAllocId === alloc.id ? '…' : '×'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 지출 연결 버튼 */}
                      {showTxPicker === item.id ? (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-xs font-semibold text-white/60">지출 내역 선택</p>
                            <button onClick={() => setShowTxPicker(null)} className="text-white/30 hover:text-white/60 text-sm">✕</button>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {expenseTransactions.length === 0 ? (
                              <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>이번 달 지출 내역이 없습니다</p>
                            ) : (
                              expenseTransactions.map(tx => {
                                const alreadyLinked = linkedTxIds.has(tx.id)
                                return (
                                  <button
                                    key={tx.id}
                                    onClick={() => !alreadyLinked && handleLinkTx(item.id, tx.id)}
                                    disabled={alreadyLinked || linkingTxId === tx.id}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors disabled:opacity-40"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                                  >
                                    <div className="min-w-0">
                                      <p className={`text-xs font-medium truncate ${alreadyLinked ? 'text-white/30' : 'text-white/80'}`}>
                                        {tx.description || tx.category}
                                      </p>
                                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.category}</p>
                                    </div>
                                    <div className="ml-2 shrink-0 text-right">
                                      <p className={`text-xs font-semibold ${alreadyLinked ? 'text-white/30' : 'text-white/70'}`}>
                                        {fmt(tx.amount)}원
                                      </p>
                                      {alreadyLinked && <p className="text-xs text-yellow-400/50">연결됨</p>}
                                      {linkingTxId === tx.id && <p className="text-xs text-yellow-400">연결 중…</p>}
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTxPicker(item.id)}
                          className="w-full py-2 rounded-xl text-xs font-medium text-yellow-400/70 hover:text-yellow-300 transition-colors"
                          style={{ border: '1px dashed rgba(250,204,21,0.3)' }}
                        >
                          + 지출 연결
                        </button>
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
