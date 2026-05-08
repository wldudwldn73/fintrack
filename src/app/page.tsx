'use client'

import { useState, useEffect, useCallback } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import MonthlySummary from '@/components/MonthlySummary'
import TransactionList from '@/components/TransactionList'
import TransactionForm from '@/components/TransactionForm'
import CsvImport from '@/components/CsvImport'
import ChatModal from '@/components/ChatModal'
import CategoryBreakdown from '@/components/CategoryBreakdown'
import Dashboard from '@/components/Dashboard'
import InsightCards from '@/components/InsightCards'
import BudgetCard from '@/components/BudgetCard'
import { Transaction, TransactionInsert, Budget } from '@/lib/types'
import { getTransactions, addTransaction, addTransactions, deleteTransaction } from '@/lib/transactions'
import { getBudgets } from '@/lib/budget'
import { generateInsights } from '@/lib/insights'

export default function Home() {
  const now = new Date()
  const [user, setUser] = useState<User | null>(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'category' | 'dashboard'>('list')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prevY = month === 1 ? year - 1 : year
      const prevM = month === 1 ? 12 : month - 1
      const [data, prevData, budgetData] = await Promise.all([
        getTransactions(year, month),
        getTransactions(prevY, prevM),
        getBudgets(year, month),
      ])
      setTransactions(data)
      setPrevTransactions(prevData)
      setBudgets(budgetData)
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

  function handleCategoryChange(id: string, category: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category } : t))
  }

  function handleBulkCategoryChange(ids: string[], category: string) {
    setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, category } : t))
  }

  function handleRecurringChange(id: string, is_recurring: boolean) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_recurring } : t))
  }

  function handleExcludedChange(id: string, is_excluded: boolean) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_excluded } : t))
  }

  // 지출 제외된 항목은 분석에서 제외
  const activeTransactions = transactions.filter(t => !t.is_excluded)
  const insights = generateInsights(activeTransactions, prevTransactions.filter(t => !t.is_excluded))

  const TABS = [
    { key: 'list' as const, label: '날짜별' },
    { key: 'category' as const, label: '카테고리' },
    { key: 'dashboard' as const, label: '대시보드' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-6 pb-28 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between anim-up">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text tracking-tight">Fintrack</span>
              <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user?.user_metadata?.name ?? user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? ''}님의 스마트 가계부
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(true)}
              className="glass ai-badge text-xs text-indigo-300 rounded-xl px-3 py-2 transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-1.5"
            >
              <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              AI 분석
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="glass text-xs rounded-xl px-3 py-2 transition-all hover:scale-105 active:scale-95 font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              CSV
            </button>
            <button
              onClick={handleLogout}
              className="glass text-xs rounded-xl px-3 py-2 transition-all hover:scale-105 active:scale-95"
              style={{ color: 'var(--text-muted)' }}
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Monthly Summary — uses active (non-excluded) transactions */}
        <div className="anim-up-1">
          <MonthlySummary
            transactions={activeTransactions}
            year={year}
            month={month}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </div>

        {/* AI Insights */}
        {!loading && insights.length > 0 && (
          <div className="anim-up-2">
            <InsightCards insights={insights} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="glass rounded-2xl p-1 flex anim-up-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                tab === t.key ? 'glass-sm text-white shadow-sm' : 'hover:text-white/70'
              }`}
              style={{ color: tab === t.key ? undefined : 'var(--text-muted)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3 anim-up-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl h-20 shimmer" />
            ))}
          </div>
        ) : tab === 'list' ? (
          <div className="anim-up-4">
            <TransactionList
              transactions={transactions}
              year={year}
              month={month}
              onDelete={handleDelete}
              onCategoryChange={handleCategoryChange}
              onBulkCategoryChange={handleBulkCategoryChange}
              onRecurringChange={handleRecurringChange}
              onExcludedChange={handleExcludedChange}
            />
          </div>
        ) : tab === 'category' ? (
          <div className="anim-up-4">
            <CategoryBreakdown transactions={activeTransactions} prevTransactions={prevTransactions.filter(t => !t.is_excluded)} />
          </div>
        ) : (
          <div className="anim-up-4 space-y-4">
            <BudgetCard
              transactions={activeTransactions}
              budgets={budgets}
              year={year}
              month={month}
              onBudgetsChange={setBudgets}
            />
            <Dashboard
              transactions={activeTransactions}
              year={year}
              month={month}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-2xl shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center glow-indigo z-50"
        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        aria-label="내역 추가"
      >
        +
      </button>

      {showForm && <TransactionForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />}
      {showChat && <ChatModal year={year} month={month} onClose={() => setShowChat(false)} onDataChange={load} />}
      {showImport && <CsvImport onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  )
}
