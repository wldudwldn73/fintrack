'use client'

import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'

interface Item {
  merchant: string
  category: string
}

interface Props {
  onClose: () => void
}

export default function LearnedCategoriesModal({ onClose }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingMerchant, setEditingMerchant] = useState<string | null>(null)
  const [deletingMerchant, setDeletingMerchant] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/learn-category')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleCategoryChange(merchant: string, category: string) {
    setItems(prev => prev.map(i => i.merchant === merchant ? { ...i, category } : i))
    setEditingMerchant(null)
    await fetch('/api/learn-category', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, category }),
    })
  }

  async function handleDelete(merchant: string) {
    setItems(prev => prev.filter(i => i.merchant !== merchant))
    setDeletingMerchant(null)
    await fetch(`/api/learn-category?merchant=${encodeURIComponent(merchant)}`, { method: 'DELETE' })
  }

  const filtered = items.filter(i =>
    i.merchant.toLowerCase().includes(search.toLowerCase()) ||
    i.category.includes(search)
  )

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full sm:max-w-sm max-h-[80vh] flex flex-col glow-indigo"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">🧠 AI 기억 목록</span>
              {items.length > 0 && (
                <span className="text-xs ai-badge px-2 py-0.5 rounded-full text-indigo-300 font-semibold">
                  {items.length}개
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              상점·거래처별로 기억된 카테고리예요
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        {items.length > 3 && (
          <div className="px-4 pt-3 pb-1 shrink-0">
            <input
              type="text"
              placeholder="상점명 또는 카테고리 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full glass-sm rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none"
            />
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
          {loading ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-3xl">🤔</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? '검색 결과가 없어요' : '아직 기억된 내역이 없어요'}
              </p>
              {!search && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  거래 카테고리를 변경하면 AI가 자동으로 기억해요
                </p>
              )}
            </div>
          ) : (
            filtered.map(item => {
              const cc = getCategoryColor(item.category)
              const isEditing = editingMerchant === item.merchant
              const isDeleting = deletingMerchant === item.merchant

              return (
                <div key={item.merchant} className="glass-sm rounded-xl px-3 py-2.5">
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="text-white font-medium">"{item.merchant}"</span> 삭제할까요?
                      </p>
                      <button
                        onClick={() => handleDelete(item.merchant)}
                        className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-semibold hover:bg-rose-500/30 transition-colors shrink-0"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeletingMerchant(null)}
                        className="text-xs px-2.5 py-1 rounded-full glass-sm text-white/50 shrink-0"
                      >
                        취소
                      </button>
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/70 truncate">{item.merchant}</p>
                      <div className="flex flex-wrap gap-1">
                        {EXPENSE_CATEGORIES.map(c => {
                          const ccc = getCategoryColor(c)
                          return (
                            <button
                              key={c}
                              onClick={() => handleCategoryChange(item.merchant, c)}
                              className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                                item.category === c
                                  ? `${ccc.bg} ${ccc.text} ring-1 ring-white/15 font-semibold`
                                  : 'glass-sm text-white/45 hover:text-white/80'
                              }`}
                            >
                              {c}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => setEditingMerchant(null)}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white/80 truncate flex-1 min-w-0">{item.merchant}</p>
                      <button
                        onClick={() => setEditingMerchant(item.merchant)}
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 transition-all hover:opacity-75 ${cc.bg} ${cc.text}`}
                      >
                        {item.category} ✎
                      </button>
                      <button
                        onClick={() => setDeletingMerchant(item.merchant)}
                        className="text-white/20 hover:text-rose-400 transition-colors text-base leading-none shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            카테고리를 바꾸면 다음번 자동 분류에 즉시 반영돼요
          </p>
        </div>
      </div>
    </div>
  )
}
