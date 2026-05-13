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
  const [defaultColorEditName, setDefaultColorEditName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isControlled = externalCats !== undefined
  const allCats: CustomCat[] = isControlled ? externalCats! : internalCats
  const defaultCats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  // 기본 카테고리 색상 오버라이드 (이름이 기본 카테고리와 겹치는 커스텀 항목)
  const defaultOverrides = Object.fromEntries(
    allCats
      .filter(c => defaultCats.includes(c.name as never))
      .map(c => [c.name, c.color])
  )

  // 실제 커스텀 카테고리만 (기본 카테고리 이름과 다른 것)
  const userCats = allCats.filter(c => c.type === type && !defaultCats.includes(c.name as never))

  // 현재 사용 중인 색상 목록
  const usedColors = new Set(allCats.map(c => c.color))

  function updateCats(next: CustomCat[]) {
    if (isControlled) onCatsChange?.(next)
    else setInternalCats(next)
  }

  // 충돌 없는 색상 자동 선택
  function pickUnusedColor(exclude?: string): string {
    const used = new Set([...usedColors, exclude].filter(Boolean))
    const free = COLOR_OPTIONS.find(o => !used.has(o.key))
    return free?.key ?? COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].key
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

  // 새 카테고리 추가 시 초기 색상 = 충돌 없는 색상
  useEffect(() => {
    if (showAdd) setNewColor(pickUnusedColor())
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // 색상 충돌 시 자동 변경
    const safeColor = usedColors.has(newColor) ? pickUnusedColor(newColor) : newColor
    setAdding(true)
    try {
      const res = await fetch('/api/custom-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, color: safeColor }),
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
    // 충돌 시 자동 변경
    const currentOwner = allCats.find(c => c.id === id)
    const safeColor = (usedColors.has(color) && currentOwner?.color !== color)
      ? pickUnusedColor(color) : color
    updateCats(allCats.map(c => c.id === id ? { ...c, color: safeColor } : c))
    setColorEditId(null)
    fetch('/api/custom-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, color: safeColor }),
    })
  }

  // 기본 카테고리 색상 오버라이드 저장 (task 3)
  async function handleDefaultColorChange(catName: string, color: string) {
    const safeColor = (() => {
      const usedExcludingSelf = new Set(
        allCats.filter(c => c.name !== catName).map(c => c.color)
      )
      return usedExcludingSelf.has(color) ? pickUnusedColor(color) : color
    })()
    setDefaultColorEditName(null)
    const res = await fetch('/api/custom-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, type, color: safeColor }),
    })
    const data = await res.json() as CustomCat
    if (data.id) {
      // 기존 오버라이드가 있으면 교체, 없으면 추가
      const exists = allCats.find(c => c.name === catName && defaultCats.includes(c.name as never))
      if (exists) updateCats(allCats.map(c => c.id === exists.id ? { ...c, color: safeColor } : c))
      else updateCats([...allCats, data])
    }
  }

  const selectedDot = COLOR_OPTIONS.find(o => o.key === newColor)?.dot ?? '#9ca3af'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {/* 기본 카테고리 — 색상 점 클릭 시 오버라이드 가능 */}
        {defaultCats.map(c => {
          const colorKey = defaultOverrides[c]
          const cc = getCategoryColor(c, colorKey)
          const isEditingColor = defaultColorEditName === c
          return (
            <span
              key={c}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isEditingColor
                  ? `${cc.bg} ${cc.text} ring-2 ring-white/25`
                  : selected === c
                    ? `${cc.bg} ${cc.text} ring-1 ring-white/15 scale-105`
                    : 'glass-sm text-white/45'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setDefaultColorEditName(isEditingColor ? null : c)
                  setColorEditId(null)
                  setShowAdd(false)
                }}
                className="w-2 h-2 rounded-full shrink-0 transition-transform hover:scale-125"
                style={{ backgroundColor: cc.dot }}
                title="색상 변경"
              />
              <button
                type="button"
                onClick={() => { onChange(c); setDefaultColorEditName(null) }}
                className="hover:text-white/80 transition-colors"
              >
                {c}
              </button>
            </span>
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
              <button
                type="button"
                onClick={() => { setColorEditId(isEditingColor ? null : c.id); setDefaultColorEditName(null); setShowAdd(false) }}
                className="w-2 h-2 rounded-full shrink-0 transition-transform hover:scale-125"
                style={{ backgroundColor: cc.dot }}
                title="색상 변경"
              />
              <button
                type="button"
                onClick={() => { onChange(c.name); setColorEditId(null) }}
                className="hover:text-white/80 transition-colors"
              >
                {c.name}
              </button>
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
            onClick={() => { setShowAdd(true); setColorEditId(null); setDefaultColorEditName(null) }}
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

      {/* 기본 카테고리 색상 변경 */}
      {defaultColorEditName && !showAdd && (
        <div className="flex flex-wrap gap-2 px-0.5 py-0.5">
          {COLOR_OPTIONS.map(opt => {
            const current = defaultOverrides[defaultColorEditName]
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleDefaultColorChange(defaultColorEditName, opt.key)}
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

      {/* 커스텀 카테고리 색상 변경 */}
      {colorEditId && !showAdd && !defaultColorEditName && (
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
