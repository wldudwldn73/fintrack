'use client'

import { useState } from 'react'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { updateTransactionCategory } from '@/lib/transactions'

interface Props {
  transactions: Transaction[]
  onDelete: (id: string) => void
  onCategoryChange: (id: string, category: string) => void
}

function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`
}

export default function TransactionList({ transactions, onDelete, onCategoryChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleCategoryChange(id: string, category: string) {
    await updateTransactionCategory(id, category)
    onCategoryChange(id, category)
    setEditingId(null)
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        이번 달 내역이 없습니다
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div className="space-y-6">
      {groups.map(([date, txs]) => (
        <div key={date}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-medium text-gray-500">{formatDate(date)}</span>
            <span className="text-xs text-gray-400">
              {txs.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0).toLocaleString('ko-KR')}원
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {txs.map(tx => (
              <div key={tx.id} className="px-4 py-3 group">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {editingId === tx.id ? (
                        <div className="flex flex-wrap gap-1 w-full">
                          {(tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                            <button
                              key={c}
                              onClick={() => handleCategoryChange(tx.id, c)}
                              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${tx.category === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {c}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-400 hover:bg-red-100"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingId(tx.id)}
                            className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 hover:bg-gray-200"
                          >
                            {tx.category} ✎
                          </button>
                          {tx.payment_method && (
                            <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full shrink-0">{tx.payment_method}</span>
                          )}
                        </>
                      )}
                    </div>
                    {tx.description && (
                      <p className="text-sm text-gray-800 font-medium mt-0.5 truncate">{tx.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-blue-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ko-KR')}원
                    </span>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
