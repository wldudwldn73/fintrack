'use client'

import { useRef, useState } from 'react'
import { ReceiptData } from '@/lib/types'

interface Props {
  onParsed: (data: ReceiptData) => void
  onCancel: () => void
}

export default function ReceiptUploader({ onParsed, onCancel }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/receipt', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '분석에 실패했습니다')
      }
      const data: ReceiptData = await res.json()
      onParsed(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '영수증 분석에 실패했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {!preview && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex-1 py-3 rounded-xl glass text-white/70 text-sm hover:text-white transition-colors"
          >
            갤러리
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 py-3 rounded-xl glass text-white/70 text-sm hover:text-white transition-colors"
          >
            📷 카메라
          </button>
        </div>
      )}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {preview && (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="영수증 미리보기" className="w-full object-contain max-h-52" />
          {loading && (
            <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white text-xs">AI 분석 중...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-rose-400 text-xs text-center">{error}</p>
          <button
            type="button"
            onClick={() => { setPreview(null); setError(null) }}
            className="w-full py-2 rounded-xl glass-sm text-white/50 text-xs hover:text-white/70 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-white/35 text-xs hover:text-white/55 transition-colors"
        >
          취소
        </button>
      )}
    </div>
  )
}
