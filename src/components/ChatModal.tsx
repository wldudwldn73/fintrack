'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  year: number
  month: number
  onClose: () => void
  onDataChange: () => void
}

const SUGGESTIONS = ['이번 달 얼마나 썼어?', '카테고리별로 정리해줘', '지출이 많은 항목이 뭐야?', '절약할 수 있는 부분 알려줘']

export default function ChatModal({ year, month, onClose, onDataChange }: Props) {
  const storageKey = `chat_${year}_${month}`
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const dataChangedRef = useRef(false)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages, storageKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)
    dataChangedRef.current = false

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          year,
          month,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)

        if (chunk.includes('[DATA_CHANGED]')) {
          dataChangedRef.current = true
        }

        const cleanChunk = chunk.replace('\n[DATA_CHANGED]', '').replace('[DATA_CHANGED]', '')
        if (cleanChunk) {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + cleanChunk }
            return next
          })
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }
        return next
      })
    } finally {
      setLoading(false)
      if (dataChangedRef.current) {
        dataChangedRef.current = false
        onDataChange()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col h-[75vh] sm:h-[600px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">AI 가계부 분석</h3>
            <p className="text-xs text-gray-400">{year}년 {month}월 · 수정·삭제 가능</p>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                대화 초기화
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">이번 달 지출에 대해 물어보거나 수정을 요청해보세요</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gray-800 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content || <span className="opacity-40">▍</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="질문하거나 수정 요청을 해보세요..."
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
