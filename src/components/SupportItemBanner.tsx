'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/types'

interface Props {
  candidates: Transaction[]
  onConfirm: (tx: Transaction) => Promise<void>
  onDismiss: (description: string) => void
}

export default function SupportItemBanner({ candidates, onConfirm, onDismiss }: Props) {
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  if (candidates.length === 0) return null
  const current = candidates[Math.min(index, candidates.length - 1)]
  if (!current) return null

  const date = new Date(current.date + 'T00:00:00')
  const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`
  const remaining = candidates.length

  function next() {
    setIndex(i => Math.min(i + 1, candidates.length - 1))
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm(current)
      if (index >= candidates.length - 1) setIndex(Math.max(0, candidates.length - 2))
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    onDismiss(current.description ?? '')
    if (index >= candidates.length - 1) setIndex(Math.max(0, candidates.length - 2))
  }

  const sourceName = current.description ?? '(알 수 없음)'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.06)' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🤝</span>
          <p className="text-xs font-semibold text-yellow-300">지원 항목일까요?</p>
        </div>
        {remaining > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-yellow-400/60">{index + 1} / {remaining}</span>
            {index < remaining - 1 && (
              <button
                onClick={next}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                다음 →
              </button>
            )}
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="px-4 pb-3 border-t border-white/5 pt-2.5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              <span className="text-yellow-300">{sourceName}</span>
              {'이(가) '}
              <span className="font-bold">{current.amount.toLocaleString('ko-KR')}원</span>
              을 대신 내줬나요?
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {dateStr} · {current.category}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
          >
            {loading ? '등록 중...' : '지원 항목 등록'}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 rounded-xl text-xs font-medium glass-sm text-white/45 hover:text-white/70 transition-colors"
          >
            아니에요
          </button>
        </div>
      </div>
    </div>
  )
}
