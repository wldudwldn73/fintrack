'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all'

function toAuthEmail(username: string) {
  return `${username.toLowerCase().trim()}@id.fintrack.app`
}

export default function SignupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'form'>('select')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleAll(checked: boolean) {
    setAgreeTerms(checked)
    setAgreePrivacy(checked)
    setAgreeMarketing(checked)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('이름을 입력해주세요'); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('아이디는 영문, 숫자, 밑줄(_)만 사용 가능하고 3~20자여야 해요')
      return
    }
    if (password !== confirm) { setError('비밀번호가 일치하지 않아요'); return }
    if (!agreeTerms || !agreePrivacy) { setError('필수 약관에 동의해주세요'); return }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email: toAuthEmail(username),
        password,
        options: { data: { name: name.trim(), username, contact_email: email, marketing: agreeMarketing } },
      })
      if (error) throw error
      router.push('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했어요'
      if (msg.includes('already registered') || msg.includes('User already registered')) setError('이미 사용 중인 아이디예요')
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

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6 anim-up">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <span className="text-3xl font-bold gradient-text tracking-tight">Fintrack</span>
              <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI가 분석하는 스마트 가계부</p>
          </div>

          <div className="glass rounded-2xl p-5 space-y-3">
            {[
              { icon: '🤖', title: 'AI 소비 분석', desc: '지출 패턴을 자동으로 분석해 인사이트를 제공해요' },
              { icon: '📊', title: '카테고리 자동 분류', desc: 'CSV 가져오기만 해도 카테고리가 자동으로 정리돼요' },
              { icon: '💬', title: 'AI 챗봇', desc: '궁금한 지출 내역은 AI에게 바로 물어보세요' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-white mb-1">계정 만들기</h2>
            <button
              onClick={handleKakao}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-[#191919] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#FEE500' }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.73 1.694 5.122 4.238 6.548L5.1 21l4.8-2.7c.68.094 1.378.144 2.1.144 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
              </svg>
              카카오로 시작하기
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>또는</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <button
              onClick={() => setMode('form')}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              아이디로 가입하기
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

  const allChecked = agreeTerms && agreePrivacy && agreeMarketing

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 anim-up">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <span className="text-2xl font-bold gradient-text tracking-tight">Fintrack</span>
            <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>아이디로 회원가입</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <button
            onClick={() => setMode('select')}
            className="text-sm flex items-center gap-1 transition-colors hover:text-white/80"
            style={{ color: 'var(--text-muted)' }}
          >
            ← 뒤로
          </button>

          <form onSubmit={handleSignup} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>이름 <span className="text-rose-400">*</span></label>
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

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>아이디 <span className="text-rose-400">*</span></label>
              <input
                type="text"
                placeholder="영문, 숫자, _ 사용 (3~20자)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={INPUT_CLASS}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>이메일 <span className="text-rose-400">*</span></label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT_CLASS}
                required
                autoComplete="email"
              />
              <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>비밀번호 찾기에 사용돼요</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>비밀번호 <span className="text-rose-400">*</span></label>
              <input
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={INPUT_CLASS}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>비밀번호 확인 <span className="text-rose-400">*</span></label>
              <input
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={INPUT_CLASS}
                required
                autoComplete="new-password"
              />
            </div>

            {/* 약관 동의 */}
            <div className="glass-sm rounded-xl p-4 space-y-2.5 mt-1">
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
