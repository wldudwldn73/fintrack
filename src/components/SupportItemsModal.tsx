'use client'

import { useState } from 'react'
import { type SupportItem, addSupportItem, deleteSupportItem } from '@/lib/supportItems'

interface Props {
  items: SupportItem[]
  year: number
  month: number
  onAdd: (item: SupportItem) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function SupportItemsModal({ items, year, month, onAdd, onDelete, onClose }: Props) {
  const defaultDate = `${year}-${String(month).padStart(2, '0')}-01`
  const [sourceName, setSourceName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const total = items.reduce((s, i) => s + i.amount, 0)

  async function handleAdd() {
    const parsed = parseInt(amount.replace(/,/g, ''), 10)
    if (!sourceName.trim() || isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    setError(null)
    try {
      await addSupportItem({ source_name: sourceName.trim(), amount: parsed, category: '지원', date })
      onAdd({
        id: crypto.randomUUID(),
        transaction_id: null,
        source_name: sourceName.trim(),
        amount: parsed,
        category: '지원',
        date,
        created_at: new Date().toISOString(),
      })
      setSourceName('')
      setAmount('')
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
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: 'var(--glass-bg, rgba(15,15,30,0.98))', border: '1px solid rgba(250,204,21,0.2)', borderBottom: 'none', maxHeight: '85vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
          {/* 내역 목록 */}
          {items.length === 0 ? (
            <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>등록된 지원금 내역이 없습니다</p>
          ) : (
            items.map(item => {
              const d = new Date(item.date + 'T00:00:00')
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.source_name ?? '(출처 없음)'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {d.getMonth() + 1}월 {d.getDate()}일
                      {item.transaction_id && <span className="ml-1.5 text-yellow-400/60">· 거래 연동</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className="text-sm font-bold text-yellow-300">{fmt(item.amount)}원</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-white/25 hover:text-rose-400 transition-colors text-lg leading-none disabled:opacity-40"
                    >
                      {deletingId === item.id ? '…' : '×'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 추가 폼 */}
        <div className="px-5 pb-8 pt-3 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold text-white/50 mb-1">직접 추가</p>
          <input
            type="text"
            placeholder="출처 (예: 엄마, 친구)"
            value={sourceName}
            onChange={e => setSourceName(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="금액"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
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
