'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const kakaoName = user.user_metadata?.name || user.user_metadata?.preferred_username || ''
      if (kakaoName) setName(kakaoName)
    })
  }, [router])

  function toggleAll(checked: boolean) {
    setAgreeTerms(checked)
    setAgreePrivacy(checked)
    setAgreeMarketing(checked)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('이름을 입력해주세요'); return }
    if (!agreeTerms || !agreePrivacy) { setError('필수 약관에 동의해주세요'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 정보를 찾을 수 없어요')

      const { error } = await supabase
        .from('tb_user_mst')
        .update({ name: name.trim(), marketing: agreeMarketing, onboarding_completed: true })
        .eq('id', user.id)

      if (error) throw error
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  const allChecked = agreeTerms && agreePrivacy && agreeMarketing

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 anim-up">

        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <span className="text-2xl font-bold gradient-text tracking-tight">Fintrack</span>
            <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>가입을 완료해주세요</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <span className="text-2xl">👋</span>
            <div>
              <p className="text-sm font-semibold text-white">환영해요!</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>몇 가지 정보만 입력하면 시작할 수 있어요</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                이름 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="실명을 입력해주세요"
                value={name}
                onChange={e => setName(e.target.value)}
                className={INPUT_CLASS}
                required
                autoComplete="name"
              />
            </div>

            <div className="glass-sm rounded-xl p-4 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={e => toggleAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span className="text-sm font-semibold text-white">전체 동의</span>
              </label>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-rose-400 mr-1">[필수]</span>서비스 이용약관 동의
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={e => setAgreePrivacy(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-rose-400 mr-1">[필수]</span>개인정보 처리방침 동의
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={e => setAgreeMarketing(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="mr-1">[선택]</span>마케팅 정보 수신 동의
                </span>
              </label>
            </div>

            {error && <p className="text-xs text-rose-400 px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-35 transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading ? '저장 중...' : '시작하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
