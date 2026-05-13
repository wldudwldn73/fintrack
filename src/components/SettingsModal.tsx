'use client'

import { useState } from 'react'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { getCategoryColor } from '@/lib/categoryColors'
import { type CategoryWidget } from '@/lib/categoryWidgets'
import { type CustomCat } from '@/components/CategoryPicker'

const QUICK_EMOJIS = ['🍽', '🛒', '☕', '🚗', '🏠', '💊', '🎬', '📚', '💳', '💰', '🎁', '👗', '✈️', '📱', '🎮']

interface Props {
  widgets: CategoryWidget[]
  customCats?: CustomCat[]
  onWidgetSave: (w: Omit<CategoryWidget, 'id'> & { id?: string }) => Promise<void>
  onWidgetDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function SettingsModal({ widgets, customCats, onWidgetSave, onWidgetDelete, onClose }: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const allCats = [
    ...EXPENSE_CATEGORIES,
    ...(customCats?.filter(c => c.type === 'expense').map(c => c.name) ?? []),
  ]

  function toggleCat(cat: string) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function handleAdd() {
    if (!name.trim() || selectedCats.size === 0 || saving) return
    setSaving(true)
    try {
      await onWidgetSave({
        name: name.trim(),
        emoji,
        categories: allCats.filter(c => selectedCats.has(c)),
        sort_order: widgets.length,
      })
      setName('')
      setEmoji('📦')
      setSelectedCats(new Set())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--glass-bg, rgba(15,15,25,0.97))', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
          <p className="font-semibold text-white">위젯 관리</p>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          {/* 현재 위젯 목록 */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>등록된 위젯</p>
            {widgets.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>아직 위젯이 없어요</p>
            ) : (
              <div className="space-y-2">
                {widgets.map(w => (
                  <div key={w.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">{w.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{w.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {w.categories.join(' · ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onWidgetDelete(w.id)}
                      className="text-white/30 hover:text-rose-400 text-lg leading-none transition-colors ml-3 shrink-0"
                      title="삭제"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 새 위젯 추가 */}
          <div className="space-y-4">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>새 위젯 추가</p>

            {/* 이름 + 이모지 */}
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="w-12 text-center glass-sm rounded-xl py-2.5 text-lg bg-transparent outline-none"
                maxLength={2}
              />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="위젯 이름 (예: 생활비, 외식비)"
                className="flex-1 glass-sm rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none placeholder-white/30"
              />
            </div>

            {/* 빠른 이모지 */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-base transition-all ${
                    emoji === e ? 'glass-sm ring-1 ring-white/25' : 'hover:glass-sm'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* 카테고리 선택 */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>포함할 카테고리</p>
              <div className="flex flex-wrap gap-1.5">
                {allCats.map(cat => {
                  const selected = selectedCats.has(cat)
                  const ck = customCats?.find(c => c.name === cat)?.color
                  const cc = getCategoryColor(cat, ck)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
                        selected
                          ? `${cc.bg} ${cc.text} ring-1 ring-white/15`
                          : 'glass-sm text-white/45 hover:text-white/70'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 추가 버튼 */}
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim() || selectedCats.size === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {saving ? '저장 중...' : '위젯 추가'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
