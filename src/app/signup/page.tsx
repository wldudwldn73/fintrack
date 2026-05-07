'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
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
      scope: 'openid profile_nickname profile_image',
    })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-medium text-gray-800">{email}</span>로<br />
            인증 링크를 보냈어요. 링크를 클릭하면 가입이 완료돼요.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">회원가입</h1>
          <p className="text-sm text-gray-400 mb-8">Fintrack에 오신 걸 환영해요 💰</p>

          <div className="space-y-3">
            <button
              onClick={handleKakao}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#FEE500' }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.73 1.694 5.122 4.238 6.548L5.1 21l4.8-2.7c.68.094 1.378.144 2.1.144 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
              </svg>
              카카오로 회원가입
            </button>

            <button
              onClick={() => setMode('email')}
              className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              이메일로 회원가입
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-gray-700 font-medium"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <button
          onClick={() => setMode('select')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">이메일 회원가입</h1>
        <p className="text-sm text-gray-400 mb-8">이메일과 비밀번호를 입력해주세요</p>

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
            required
          />

          {error && <p className="text-xs text-red-500 px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          이미 계정이 있으신가요?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-gray-700 font-medium"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
