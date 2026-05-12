'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/types'

interface Pattern {
  type: string
  severity: 'high' | 'medium'
  scold: string
  tip: string
}

interface CoachResult {
  patterns: Pattern[]
  overall: string | null
}

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onClose: () => void
}

export default function CoachModal({ transactions, year, month, onClose }: Props) {
  const [result, setResult] = useState<CoachResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  async function runCoach() {
    setStarted(true)
    setLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, year, month }),
      })
      const data = await res.json() as CoachResult
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  const hasIssues = result && result.patterns.length > 0

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full sm:max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        style={{ border: '1px solid rgba(239,68,68,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔴</span>
              <div>
                <p className="text-sm font-bold text-white">AI 소비 코치</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{year}년 {month}월 소비 진단</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {!started ? (
            /* 시작 전 */
            <div className="text-center py-6 space-y-4">
              <p className="text-4xl">😤</p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">이번 달 소비, 솔직하게 봐드릴게요</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  칭찬보다 직설적인 피드백이 필요할 때가 있어요.<br />
                  문제 패턴을 발견하면 단호하게 말해드립니다.
                </p>
              </div>
              <button
                onClick={runCoach}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                진단 시작
              </button>
            </div>
          ) : loading ? (
            /* 로딩 */
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 px-1">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                <p className="text-xs text-rose-300">소비 패턴 분석 중...</p>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl p-4 space-y-2"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <div className="h-3 rounded shimmer w-1/3" />
                  <div className="h-2.5 rounded shimmer w-full" />
                  <div className="h-2.5 rounded shimmer w-4/5" />
                </div>
              ))}
            </div>
          ) : result ? (
            /* 결과 */
            <>
              {!hasIssues ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-4xl">✅</p>
                  <p className="text-sm font-semibold text-emerald-300">이번 달은 비교적 양호해요</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {result.overall ?? '특별한 문제 패턴이 감지되지 않았어요. 이 상태를 유지하세요!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-sm shrink-0">📋</span>
                    <p className="text-xs text-rose-300 font-medium">
                      {result.patterns.length}개 문제 패턴이 감지됐어요
                    </p>
                  </div>

                  {result.patterns.map((p, i) => (
                    <div key={i} className="rounded-xl overflow-hidden"
                      style={{
                        border: p.severity === 'high'
                          ? '1px solid rgba(239,68,68,0.35)'
                          : '1px solid rgba(251,191,36,0.3)',
                      }}>
                      {/* 패턴 헤더 */}
                      <div className="px-3 py-2 flex items-center gap-2"
                        style={{
                          background: p.severity === 'high'
                            ? 'rgba(239,68,68,0.12)'
                            : 'rgba(251,191,36,0.08)',
                        }}>
                        <span className="text-sm">{p.severity === 'high' ? '🚨' : '⚠️'}</span>
                        <span className={`text-xs font-bold ${p.severity === 'high' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {p.type}
                        </span>
                      </div>

                      {/* 혼내기 */}
                      <div className="px-3 py-3 border-t border-white/5">
                        <p className={`text-xs leading-relaxed font-medium ${p.severity === 'high' ? 'text-rose-200' : 'text-amber-200'}`}>
                          {p.scold}
                        </p>
                      </div>

                      {/* 팁 */}
                      <div className="px-3 py-2.5 border-t border-white/5"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs shrink-0 mt-0.5">💡</span>
                          <p className="text-xs text-cyan-300 leading-relaxed">{p.tip}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 총평 */}
                  {result.overall && (
                    <div className="rounded-xl px-4 py-3"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <p className="text-xs text-indigo-200 leading-relaxed">{result.overall}</p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Footer — 재진단 버튼 */}
        {started && !loading && result && (
          <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/5">
            <button
              onClick={runCoach}
              className="w-full py-2 rounded-xl text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              다시 진단
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
