'use client'

import { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export default function MonthlySummary({ transactions, year, month, onPrev, onNext }: Props) {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense
  const savingRate = income > 0 ? Math.round((balance / income) * 100) : null

  const fmt = (n: number) => n.toLocaleString('ko-KR')

  return (
    <div className="glass rounded-2xl p-5 glow-indigo relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5 relative">
        <button
          onClick={onPrev}
          className="glass-sm w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white/50 hover:text-white text-lg"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{year}년</p>
          <h2 className="text-xl font-bold text-white">{month}월</h2>
        </div>
        <button
          onClick={onNext}
          className="glass-sm w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white/50 hover:text-white text-lg"
        >
          ›
        </button>
      </div>

      {/* Balance hero */}
      <div className="text-center mb-5 relative">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>순 잔액</p>
        <p className={`text-3xl font-bold tracking-tight ${
          balance >= 0 ? 'text-emerald-300 text-glow-emerald' : 'text-rose-300 text-glow-rose'
        }`}>
          {balance >= 0 ? '+' : ''}{fmt(balance)}원
        </p>
        {savingRate !== null && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            저축률{' '}
            <span className={`font-semibold ${
              savingRate >= 20 ? 'text-emerald-400' : savingRate >= 0 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {savingRate}%
            </span>
          </p>
        )}
      </div>

      {/* Income / Expense */}
      <div className="grid grid-cols-2 gap-3 relative">
        <div className="glass-sm rounded-xl px-4 py-3 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>수입</p>
          <p className="text-sm font-bold text-cyan-300 text-glow-cyan">{fmt(income)}원</p>
        </div>
        <div className="glass-sm rounded-xl px-4 py-3 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>지출</p>
          <p className="text-sm font-bold text-rose-300 text-glow-rose">{fmt(expense)}원</p>
        </div>
      </div>
    </div>
  )
}
