'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function toFakeEmail(username: string) {
  return `${username.toLowerCase().trim()}@id.fintrack.app`
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: toFakeEmail(username),
        password,
      })
      if (error) throw error
      router.push('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했어요'
      if (msg.includes('Invalid login')) setError('아이디 또는 비밀번호가 올바르지 않아요')
      else if (msg.includes('Email not confirmed')) setError('계정 인증이 필요해요. 관리자에게 문의해주세요.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKakao() {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
      redirect_uri: `${window.location.origin}/auth/kakao/callback`,
      response_type: 'code',
      scope: 'openid',
    })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 anim-up">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <span className="text-3xl font-bold gradient-text tracking-tight">Fintrack</span>
            <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI가 분석하는 스마트 가계부</p>
        </div>

        <div className="glass rounded-2xl p-7 glow-indigo space-y-4">
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={INPUT_CLASS}
              required
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={INPUT_CLASS}
              required
            />

            {error && (
              <p className="text-xs text-rose-400 px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-35 transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>또는</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <button
            onClick={handleKakao}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-[#191919] transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#FEE500' }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.73 1.694 5.122 4.238 6.548L5.1 21l4.8-2.7c.68.094 1.378.144 2.1.144 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
            </svg>
            카카오로 로그인
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          계정이 없으신가요?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
