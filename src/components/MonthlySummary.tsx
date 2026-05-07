'use client'

import { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export default function MonthlySummary({ transactions, year, month, onPrev, onNext }: Props) {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = income - expense

  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onPrev} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          &#8249;
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {year}년 {month}월
        </h2>
        <button onClick={onNext} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          &#8250;
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500 mb-1">수입</p>
          <p className="text-base font-semibold text-blue-600">{fmt(income)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">지출</p>
          <p className="text-base font-semibold text-red-500">{fmt(expense)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">잔액</p>
          <p className={`text-base font-semibold ${balance >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
            {fmt(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}
