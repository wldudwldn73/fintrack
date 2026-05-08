'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

export default function SignupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'email'>('select')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않아요'); return }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했어요'
      if (msg.includes('already registered')) setError('이미 가입된 이메일이에요. 로그인해주세요.')
      else if (msg.includes('Password should be')) setError('비밀번호는 6자 이상이어야 해요')
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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 w-full max-w-sm text-center glow-indigo anim-up">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-lg font-bold text-white mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold text-white">{email}</span>로<br />
            인증 링크를 보냈어요. 링크를 클릭하면 가입이 완료돼요.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] glow-indigo"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 anim-up">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <span className="text-3xl font-bold gradient-text tracking-tight">Fintrack</span>
              <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI 가계부에 오신 걸 환영해요</p>
          </div>

          <div className="glass rounded-2xl p-7 glow-indigo space-y-3">
            <h2 className="text-base font-semibold text-white mb-4">회원가입</h2>

            <button
              onClick={handleKakao}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-[#191919] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.73 1.694 5.122 4.238 6.548L5.1 21l4.8-2.7c.68.094 1.378.144 2.1.144 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
              </svg>
              카카오로 회원가입
            </button>

            <button
              onClick={() => setMode('email')}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              이메일로 회원가입
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            이미 계정이 있으신가요?{' '}
            <button onClick={() => router.push('/login')} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              로그인
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 anim-up">
        <div className="text-center">
          <span className="text-2xl font-bold gradient-text tracking-tight">이메일 회원가입</span>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>이메일과 비밀번호를 입력해주세요</p>
        </div>

        <div className="glass rounded-2xl p-7 glow-indigo space-y-4">
          <button
            onClick={() => setMode('select')}
            className="text-sm flex items-center gap-1 transition-colors hover:text-white/80 mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            ← 뒤로
          </button>

          <form onSubmit={handleSignup} className="space-y-3">
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} className={INPUT_CLASS} required />
            <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} className={INPUT_CLASS} required minLength={6} />
            <input type="password" placeholder="비밀번호 확인" value={confirm} onChange={e => setConfirm(e.target.value)} className={INPUT_CLASS} required />

            {error && <p className="text-xs text-rose-400 px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-35 transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <button onClick={() => router.push('/login')} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
