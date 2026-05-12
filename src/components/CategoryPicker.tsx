'use client'

import { useState, useEffect, useRef } from 'react'
import { TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { getCategoryColor, COLOR_OPTIONS } from '@/lib/categoryColors'

export interface CustomCat { id: string; name: string; type: string; color: string }

interface Props {
  type: TransactionType
  selected: string
  onChange: (category: string) => void
  externalCats?: CustomCat[]
  onCatsChange?: (cats: CustomCat[]) => void
}

export default function CategoryPicker({ type, selected, onChange, externalCats, onCatsChange }: Props) {
  const [internalCats, setInternalCats] = useState<CustomCat[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('zinc')
  const [adding, setAdding] = useState(false)
  const [colorEditId, setColorEditId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isControlled = externalCats !== undefined
  const allCats: CustomCat[] = isControlled ? externalCats! : internalCats
  const userCats = allCats.filter(c => c.type === type)
  const defaultCats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function updateCats(next: CustomCat[]) {
    if (isControlled) onCatsChange?.(next)
    else setInternalCats(next)
  }

  useEffect(() => {
    if (isControlled) return
    fetch('/api/custom-categories')
      .then(r => r.json())
      .then((d: CustomCat[]) => setInternalCats(Array.isArray(d) ? d : []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (showAdd) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showAdd])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const allNames = [...defaultCats as readonly string[], ...userCats.map(c => c.name)]
    if (allNames.includes(name)) {
      onChange(name)
      setNewName('')
      setShowAdd(false)
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/custom-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, color: newColor }),
      })
      const data = await res.json() as CustomCat
      if (data.id) {
        updateCats([...allCats, data])
        onChange(data.name)
      }
    } finally {
      setAdding(false)
      setNewName('')
      setNewColor('zinc')
      setShowAdd(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    updateCats(allCats.filter(c => c.id !== id))
    if (selected === name) onChange('')
    fetch(`/api/custom-categories?id=${id}`, { method: 'DELETE' })
  }

  async function handleColorChange(id: string, color: string) {
    updateCats(allCats.map(c => c.id === id ? { ...c, color } : c))
    setColorEditId(null)
    fetch('/api/custom-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, color }),
    })
  }

  const selectedDot = COLOR_OPTIONS.find(o => o.key === newColor)?.dot ?? '#9ca3af'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {/* 기본 카테고리 */}
        {defaultCats.map(c => {
          const cc = getCategoryColor(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setColorEditId(null) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selected === c
                  ? `${cc.bg} ${cc.text} ring-1 ring-white/15 scale-105`
                  : 'glass-sm text-white/45 hover:text-white/70'
              }`}
            >
              {c}
            </button>
          )
        })}

        {/* 커스텀 카테고리 */}
        {userCats.map(c => {
          const cc = getCategoryColor(c.name, c.color)
          const isSelected = selected === c.name
          const isEditingColor = colorEditId === c.id
          return (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isEditingColor
                  ? `${cc.bg} ${cc.text} ring-2 ring-white/25`
                  : isSelected
                    ? `${cc.bg} ${cc.text} ring-1 ring-white/15 scale-105`
                    : 'glass-sm text-white/45'
              }`}
            >
              {/* 색상 점 — 클릭 시 색상 편집 */}
              <button
                type="button"
                onClick={() => { setColorEditId(isEditingColor ? null : c.id); setShowAdd(false) }}
                className="w-2 h-2 rounded-full shrink-0 transition-transform hover:scale-125"
                style={{ backgroundColor: cc.dot }}
                title="색상 변경"
              />
              {/* 이름 — 클릭 시 선택 */}
              <button
                type="button"
                onClick={() => { onChange(c.name); setColorEditId(null) }}
                className="hover:text-white/80 transition-colors"
              >
                {c.name}
              </button>
              {/* 삭제 */}
              <button
                type="button"
                onClick={() => handleDelete(c.id, c.name)}
                className="text-white/25 hover:text-rose-400 transition-colors leading-none ml-0.5"
                title="삭제"
              >
                ×
              </button>
            </span>
          )
        })}

        {/* + 추가 버튼 / 인풋 */}
        {showAdd ? (
          <span className="inline-flex items-center gap-1.5 glass-sm rounded-full px-2.5 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30" style={{ backgroundColor: selectedDot }} />
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                if (e.key === 'Escape') { setShowAdd(false); setNewName('') }
              }}
              placeholder="카테고리명"
              className="bg-transparent text-xs text-white placeholder-white/30 outline-none w-20"
              maxLength={10}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="text-xs text-indigo-400 font-semibold disabled:opacity-40 hover:text-indigo-300 transition-colors shrink-0"
            >
              {adding ? '…' : '확인'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(''); setNewColor('zinc') }}
              className="text-white/30 hover:text-white/60 transition-colors leading-none shrink-0"
            >
              ×
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => { setShowAdd(true); setColorEditId(null) }}
            className="px-3 py-1.5 rounded-full text-xs glass-sm text-white/35 hover:text-white/60 transition-all border border-white/10 border-dashed"
          >
            + 추가
          </button>
        )}
      </div>

      {/* 새 카테고리 색상 선택 */}
      {showAdd && (
        <div className="flex flex-wrap gap-2 px-0.5 py-0.5">
          {COLOR_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setNewColor(opt.key)}
              className={`w-5 h-5 rounded-full transition-all ${
                newColor === opt.key
                  ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-black/30 scale-110'
                  : 'opacity-55 hover:opacity-90'
              }`}
              style={{ backgroundColor: opt.dot }}
            />
          ))}
        </div>
      )}

      {/* 기존 카테고리 색상 변경 */}
      {colorEditId && !showAdd && (
        <div className="flex flex-wrap gap-2 px-0.5 py-0.5">
          {COLOR_OPTIONS.map(opt => {
            const current = userCats.find(c => c.id === colorEditId)?.color
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleColorChange(colorEditId, opt.key)}
                className={`w-5 h-5 rounded-full transition-all ${
                  current === opt.key
                    ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-black/30 scale-110'
                    : 'opacity-55 hover:opacity-90'
                }`}
                style={{ backgroundColor: opt.dot }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
