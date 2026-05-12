'use client'

import { useState, useEffect } from 'react'
import { TransactionInsert, TransactionType } from '@/lib/types'
import { getRuleBasedCategory } from '@/lib/categoryRules'
import CategoryPicker from '@/components/CategoryPicker'

interface Props {
  onSubmit: (tx: TransactionInsert) => Promise<void>
  onClose: () => void
}

const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

export default function TransactionForm({ onSubmit, onClose }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!description || category) return
    const suggested = getRuleBasedCategory(description, type)
    if (suggested) setCategory(suggested)
  }, [description, type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    try {
      await onSubmit({ type, amount: Number(amount), category, description: description || undefined, date })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-0 sm:px-4" onClick={onClose}>
      <div
        className="glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 glow-indigo"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">내역 추가</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-500/80 text-white glow-rose'
                      : 'bg-cyan-500/70 text-white glow-cyan'
                    : 'glass-sm text-white/45 hover:text-white/70'
                }`}
              >
                {t === 'expense' ? '지출' : '수입'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <input
            type="number"
            placeholder="금액"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={INPUT_CLASS}
            required
          />

          {/* Category picker */}
          <CategoryPicker type={type} selected={category} onChange={setCategory} />

          {/* Description */}
          <input
            type="text"
            placeholder="메모 (선택)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={INPUT_CLASS}
          />

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={INPUT_CLASS}
            required
          />

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl glass-sm text-white/50 text-sm font-medium hover:text-white/80 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !amount || !category}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-35 transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
