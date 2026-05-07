'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했어요'
      if (msg.includes('Invalid login')) setError('이메일 또는 비밀번호가 올바르지 않아요')
      else if (msg.includes('Email not confirmed')) setError('이메일 인증을 먼저 완료해주세요')
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Fintrack 💰</h1>
        <p className="text-sm text-gray-400 mb-8">내 가계부에 로그인하세요</p>

        <form onSubmit={handleLogin} className="space-y-3">
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
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
            required
          />

          {error && <p className="text-xs text-red-500 px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <button
          onClick={handleKakao}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#FEE500' }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#191919">
            <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.73 1.694 5.122 4.238 6.548L5.1 21l4.8-2.7c.68.094 1.378.144 2.1.144 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
          </svg>
          카카오로 로그인
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          계정이 없으신가요?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-gray-700 font-medium"
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
