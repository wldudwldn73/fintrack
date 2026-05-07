'use client'

import { useState, useEffect, useCallback } from 'react'
import MonthlySummary from '@/components/MonthlySummary'
import TransactionList from '@/components/TransactionList'
import TransactionForm from '@/components/TransactionForm'
import CsvImport from '@/components/CsvImport'
import ChatModal from '@/components/ChatModal'
import CategoryBreakdown from '@/components/CategoryBreakdown'
import { Transaction, TransactionInsert } from '@/lib/types'
import { getTransactions, addTransaction, addTransactions, deleteTransaction } from '@/lib/transactions'

export default function Home() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'category'>('list')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransactions(year, month)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  async function handleAdd(tx: TransactionInsert) {
    await addTransaction(tx)
    await load()
  }

  async function handleImport(txs: TransactionInsert[]) {
    await addTransactions(txs)
    await load()
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Fintrack 💰</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(true)}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              AI 분석
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              CSV 가져오기
            </button>
          </div>
        </div>

        <MonthlySummary
          transactions={transactions}
          year={year}
          month={month}
          onPrev={prevMonth}
          onNext={nextMonth}
        />

        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('list')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            날짜별
          </button>
          <button
            onClick={() => setTab('category')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === 'category' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            카테고리별
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
        ) : tab === 'list' ? (
          <TransactionList transactions={transactions} onDelete={handleDelete} />
        ) : (
          <CategoryBreakdown transactions={transactions} />
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-800 text-white rounded-full text-2xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
      >
        +
      </button>

      {showForm && (
        <TransactionForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />
      )}

      {showChat && (
        <ChatModal year={year} month={month} onClose={() => setShowChat(false)} onDataChange={load} />
      )}

      {showImport && (
        <CsvImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
