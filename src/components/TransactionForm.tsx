'use client'

import { useState, useEffect, useRef } from 'react'
import { TransactionInsert, TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getRuleBasedCategory } from '@/lib/categoryRules'
import { getCategoryColor } from '@/lib/categoryColors'

interface CustomCat { id: string; name: string; type: string }

interface Props {
  onSubmit: (tx: TransactionInsert) => Promise<void>
  onClose: () => void
}

const INPUT_CLASS = 'w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

export default function TransactionForm({ onSubmit, onClose }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const [customCats, setCustomCats] = useState<CustomCat[]>([])
  const [showAddInput, setShowAddInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const newCatInputRef = useRef<HTMLInputElement>(null)

  const defaultCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const userCats = customCats.filter(c => c.type === type)

  useEffect(() => {
    fetch('/api/custom-categories')
      .then(r => r.json())
      .then((data: CustomCat[]) => setCustomCats(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (showAddInput) setTimeout(() => newCatInputRef.current?.focus(), 50)
  }, [showAddInput])

  useEffect(() => {
    if (!description || category) return
    const suggested = getRuleBasedCategory(description, type)
    if (suggested) setCategory(suggested)
  }, [description, type])

  async function handleAddCat() {
    const name = newCatName.trim()
    if (!name) return
    const isDuplicate = [...defaultCategories as readonly string[], ...userCats.map(c => c.name)]
      .some(c => c === name)
    if (isDuplicate) {
      setNewCatName('')
      setShowAddInput(false)
      setCategory(name)
      return
    }
    setAddingCat(true)
    try {
      const res = await fetch('/api/custom-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })
      const data = await res.json() as CustomCat
      if (data.id) {
        setCustomCats(prev => [...prev, data])
        setCategory(data.name)
      }
    } finally {
      setAddingCat(false)
      setNewCatName('')
      setShowAddInput(false)
    }
  }

  async function handleDeleteCat(id: string, name: string) {
    setCustomCats(prev => prev.filter(c => c.id !== id))
    if (category === name) setCategory('')
    fetch(`/api/custom-categories?id=${id}`, { method: 'DELETE' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    try {
      await onSubmit({ type, amount: Number(amount), category, description: description || undefined, date })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-0 sm:px-4" onClick={onClose}>
      <div
        className="glass rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 glow-indigo"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">내역 추가</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(''); setShowAddInput(false) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-500/80 text-white glow-rose'
                      : 'bg-cyan-500/70 text-white glow-cyan'
                    : 'glass-sm text-white/45 hover:text-white/70'
                }`}
              >
                {t === 'expense' ? '지출' : '수입'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <input
            type="number"
            placeholder="금액"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={INPUT_CLASS}
            required
          />

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* 기본 카테고리 */}
            {defaultCategories.map(c => {
              const cc = getCategoryColor(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === c
                      ? `${cc.bg} ${cc.text} ring-1 ring-white/15 scale-105`
                      : 'glass-sm text-white/45 hover:text-white/70'
                  }`}
                >
                  {c}
                </button>
              )
            })}

            {/* 사용자 커스텀 카테고리 */}
            {userCats.map(c => {
              const cc = getCategoryColor(c.name)
              return (
                <span
                  key={c.id}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === c.name
                      ? `${cc.bg} ${cc.text} ring-1 ring-white/15 scale-105`
                      : 'glass-sm text-white/45'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className="hover:text-white/80 transition-colors"
                  >
                    {c.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCat(c.id, c.name)}
                    className="text-white/30 hover:text-rose-400 transition-colors leading-none ml-0.5"
                    title="삭제"
                  >
                    ×
                  </button>
                </span>
              )
            })}

            {/* + 추가 버튼 / 인풋 */}
            {showAddInput ? (
              <span className="inline-flex items-center gap-1 glass-sm rounded-full px-2 py-1">
                <input
                  ref={newCatInputRef}
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCat() }
                    if (e.key === 'Escape') { setShowAddInput(false); setNewCatName('') }
                  }}
                  placeholder="카테고리명"
                  className="bg-transparent text-xs text-white placeholder-white/30 outline-none w-20"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={handleAddCat}
                  disabled={addingCat || !newCatName.trim()}
                  className="text-xs text-indigo-400 font-semibold disabled:opacity-40 hover:text-indigo-300 transition-colors"
                >
                  {addingCat ? '…' : '확인'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddInput(false); setNewCatName('') }}
                  className="text-white/30 hover:text-white/60 transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="px-3 py-1.5 rounded-full text-xs glass-sm text-white/35 hover:text-white/60 transition-all border border-white/10 border-dashed"
              >
                + 추가
              </button>
            )}
          </div>

          {/* Description */}
          <input
            type="text"
            placeholder="메모 (선택)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={INPUT_CLASS}
          />

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={INPUT_CLASS}
            required
          />

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl glass-sm text-white/50 text-sm font-medium hover:text-white/80 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !amount || !category}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-35 transition-all hover:scale-[1.02] active:scale-[0.98] glow-indigo"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
