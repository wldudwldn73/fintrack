'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/types'

export const INCOME_KEYWORDS = ['입금', '송금', '월급', '지급', '급여', '이자', '환급', '보너스', '장학금', '배당']
const DISMISSED_KEY = 'fintrack_dismissed_income'

export function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

export function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
  } catch {}
}

function guessIncomeCategory(description: string): string {
  if (/월급|급여|연봉|임금/.test(description)) return '급여'
  if (/이자|배당|투자|펀드/.test(description)) return '투자'
  if (/부업|프리랜서|외주|알바/.test(description)) return '부업'
  return '기타'
}

interface Props {
  candidates: Transaction[]
  onConfirm: (id: string, category: string) => void
  onDismiss: (description: string) => void
}

export default function IncomeCandidateBanner({ candidates, onConfirm, onDismiss }: Props) {
  const [index, setIndex] = useState(0)

  if (candidates.length === 0) return null
  const current = candidates[Math.min(index, candidates.length - 1)]
  if (!current) return null

  const category = guessIncomeCategory(current.description ?? '')
  const date = new Date(current.date + 'T00:00:00')
  const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`
  const remaining = candidates.length

  function next() {
    setIndex(i => Math.min(i + 1, candidates.length - 1))
  }

  function handleConfirm() {
    onConfirm(current.id, category)
    if (index >= candidates.length - 1) setIndex(Math.max(0, candidates.length - 2))
  }

  function handleDismiss() {
    onDismiss(current.description ?? '')
    if (index >= candidates.length - 1) setIndex(Math.max(0, candidates.length - 2))
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">💰</span>
          <p className="text-xs font-semibold text-emerald-300">수입 항목일까요?</p>
        </div>
        {remaining > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-emerald-400/60">{index + 1} / {remaining}</span>
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
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{current.description ?? '(설명 없음)'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {dateStr} · {current.amount.toLocaleString('ko-KR')}원
            </p>
          </div>
          <span className="ml-3 shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
            → {category}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            수입으로 등록
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
