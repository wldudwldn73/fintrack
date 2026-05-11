'use client'

import { useEffect, useState } from 'react'

interface RecurringItem {
  description: string
  category: string
  avgAmount: number
  monthCount: number
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍽', 카페: '☕', 편의점: '🏪', 교통: '🚌', 쇼핑: '🛍', 구독: '📱',
  주거: '🏠', 의료: '💊', 문화: '🎬', 교육: '📚', 급여: '💰', 투자: '📈',
  부업: '💼', 보험: '🛡', 적금: '🏦', 기부금: '🤝', 기타: '📦',
}

export default function RecurringTab() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recurring')
      .then(r => r.json())
      .then(d => setItems(d.recurring ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-16 text-gray-400 text-sm">분석 중...</div>
  }

  if (!items.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        <p>2개월 이상 반복된 지출이 없어요</p>
        <p className="text-xs mt-2">거래내역이 쌓이면 자동으로 감지해요</p>
      </div>
    )
  }

  const totalMonthly = items.reduce((s, i) => s + i.avgAmount, 0)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
        <p className="text-xs text-gray-400 mb-1">예상 월 고정지출 합계</p>
        <p className="text-xl font-bold text-gray-900">{totalMonthly.toLocaleString('ko-KR')}원</p>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{CATEGORY_EMOJI[item.category] ?? '📦'}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                <p className="text-xs text-gray-400">{item.category} · {item.monthCount}개월 반복</p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-semibold text-gray-900">월 {item.avgAmount.toLocaleString()}원</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
