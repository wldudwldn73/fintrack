'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import CalendarTab from '@/components/CalendarTab'
import LearnedCategoriesModal from '@/components/LearnedCategoriesModal'
import CoachModal from '@/components/CoachModal'
import { Transaction, TransactionInsert, Budget } from '@/lib/types'
import { getTransactions, addTransaction, addTransactions, deleteTransaction, updateTransactionType, updateTransactionAmount } from '@/lib/transactions'
import { type CustomCat } from '@/components/CategoryPicker'
import IncomeCandidateBanner, { INCOME_KEYWORDS, loadDismissed, saveDismissed } from '@/components/IncomeCandidateBanner'
import { getBudgets } from '@/lib/budget'
import { getCategoryWidgets, upsertCategoryWidget, deleteCategoryWidget, type CategoryWidget } from '@/lib/categoryWidgets'
import SettingsModal from '@/components/SettingsModal'
import MonthlyTrendChart from '@/components/MonthlyTrendChart'
import { generateInsights } from '@/lib/insights'
import SupportItemBanner from '@/components/SupportItemBanner'
import SupportItemsModal from '@/components/SupportItemsModal'
import { SUPPORT_KEYWORDS, loadDismissedSupport, saveDismissedSupport, getSupportItems, addSupportItem, type SupportItem } from '@/lib/supportItems'

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
  const [showLearnedCategories, setShowLearnedCategories] = useState(false)
  const [showCoach, setShowCoach] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'category' | 'dashboard'>('list')
  const [customCats, setCustomCats] = useState<CustomCat[]>([])
  const [dismissedIncome, setDismissedIncome] = useState<Set<string>>(() => loadDismissed())
  const [dismissedSupport, setDismissedSupport] = useState<Set<string>>(() => loadDismissedSupport())
  const [supportItems, setSupportItems] = useState<SupportItem[]>([])
  const [widgets, setWidgets] = useState<CategoryWidget[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  useEffect(() => {
    getCategoryWidgets().then(setWidgets).catch(() => {})
  }, [])
  useEffect(() => {
    fetch('/api/custom-categories')
      .then(r => r.json())
      .then((d: CustomCat[]) => setCustomCats(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

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
      const [data, prevData, budgetData, supportData] = await Promise.all([
        getTransactions(year, month),
        getTransactions(prevY, prevM),
        getBudgets(year, month),
        getSupportItems(year, month),
      ])
      setTransactions(data)
      setPrevTransactions(prevData)
      setBudgets(budgetData)
      setSupportItems(supportData)
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

  function handleBulkExcludedChange(ids: string[]) {
    setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, is_excluded: true } : t))
  }

  function handleMetaChange(id: string, description: string | null, memo: string | null) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, description, memo } : t))
  }

  function handleSortOrderChange(updates: { id: string; sort_order: number }[]) {
    const map = Object.fromEntries(updates.map(u => [u.id, u.sort_order]))
    setTransactions(prev => prev.map(t => map[t.id] !== undefined ? { ...t, sort_order: map[t.id] } : t))
  }

  function handleHiddenChange(id: string, is_hidden: boolean) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_hidden } : t))
  }

  function handleAmountChange(id: string, amount: number) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, amount } : t))
  }

  function handleDateChange(id: string, date: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, date } : t))
  }

  async function handleWidgetSave(w: Omit<CategoryWidget, 'id'> & { id?: string }) {
    const withOrder = w.id ? w : { ...w, sort_order: widgets.length }
    const saved = await upsertCategoryWidget(withOrder)
    setWidgets(prev => {
      const exists = prev.find(x => x.id === saved.id)
      if (exists) return prev.map(x => x.id === saved.id ? saved : x)
      return [...prev, saved]
    })
  }

  async function handleWidgetDelete(id: string) {
    await deleteCategoryWidget(id)
    setWidgets(prev => prev.filter(w => w.id !== id))
  }

  async function handleIncomeConfirm(id: string, category: string) {
    await updateTransactionType(id, 'income', category)
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, type: 'income' as const, category } : t))
  }

  function handleIncomeDismiss(description: string) {
    const next = new Set(dismissedIncome)
    next.add(description)
    setDismissedIncome(next)
    saveDismissed(next)
  }

  async function handleSupportConfirm(tx: Transaction) {
    await addSupportItem({
      transaction_id: tx.id,
      source_name: tx.description ?? undefined,
      amount: tx.amount,
      category: '지원',
      date: tx.date,
    })
    setSupportItems(prev => [...prev, {
      id: crypto.randomUUID(),
      transaction_id: tx.id,
      source_name: tx.description,
      amount: tx.amount,
      category: '지원',
      date: tx.date,
      created_at: new Date().toISOString(),
      purpose: null,
    }])
  }

  function handleSupportDismiss(description: string) {
    const next = new Set(dismissedSupport)
    next.add(description)
    setDismissedSupport(next)
    saveDismissedSupport(next)
  }

  // 지출 제외/숨김 항목은 분석에서 제외
  const activeTransactions = transactions.filter(t => !t.is_excluded && !t.is_hidden)
  const insights = generateInsights(activeTransactions, prevTransactions.filter(t => !t.is_excluded))

  // 수입 후보: expense이지만 수입 키워드가 포함된 항목 (dismissedIncome 제외)
  const incomeCandidates = useMemo(() => {
    if (loading) return []
    return transactions.filter(t =>
      t.type === 'expense' &&
      !t.is_excluded &&
      t.description &&
      INCOME_KEYWORDS.some(kw => t.description!.includes(kw)) &&
      !dismissedIncome.has(t.description!)
    )
  }, [transactions, loading, dismissedIncome])

  // 지원 후보: income이지만 지원 키워드가 포함된 항목 (이미 지원 항목 등록된 것 + dismissedSupport 제외)
  const registeredSupportTxIds = new Set(supportItems.map(s => s.transaction_id).filter(Boolean))
  const supportCandidates = useMemo(() => {
    if (loading) return []
    return transactions.filter(t =>
      t.type === 'income' &&
      t.description &&
      SUPPORT_KEYWORDS.some(kw => t.description!.includes(kw)) &&
      !registeredSupportTxIds.has(t.id) &&
      !dismissedSupport.has(t.description!)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, loading, dismissedSupport, supportItems])

  const supportTotal = supportItems.reduce((s, i) => s + i.amount, 0)

  const TABS = [
    { key: 'list' as const, label: '달력' },
    { key: 'category' as const, label: '카테고리' },
    { key: 'dashboard' as const, label: '대시보드' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-6 pb-28 space-y-4">

        {/* Header */}
        <header className="anim-up space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text tracking-tight">Fintrack</span>
              <span className="ai-badge text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold">AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCoach(true)}
                className="glass text-base rounded-xl px-2.5 py-1.5 transition-all hover:scale-105 active:scale-95 leading-none"
                title="AI 소비 코치"
              >
                😤
              </button>
              <button
                onClick={() => setShowLearnedCategories(true)}
                className="glass text-base rounded-xl px-2.5 py-1.5 transition-all hover:scale-105 active:scale-95 leading-none"
                title="AI 기억 목록"
              >
                🧠
              </button>
              <button
                onClick={() => setShowChat(true)}
                className="glass ai-badge text-xs text-indigo-300 rounded-xl px-2.5 py-1.5 transition-all hover:scale-105 active:scale-95 font-medium flex items-center gap-1"
              >
                <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                AI분석
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="glass text-xs rounded-xl px-2.5 py-1.5 transition-all hover:scale-105 active:scale-95 font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                CSV
              </button>
              <button
                onClick={handleLogout}
                className="glass text-xs rounded-xl px-2.5 py-1.5 transition-all hover:scale-105 active:scale-95"
                style={{ color: 'var(--text-muted)' }}
              >
                로그아웃
              </button>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {user?.user_metadata?.name ?? user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? ''}님의 스마트 가계부
          </p>
        </header>

        {/* Monthly Summary — uses active (non-excluded) transactions */}
        <div className="anim-up-1">
          <MonthlySummary
            transactions={activeTransactions}
            year={year}
            month={month}
            onPrev={prevMonth}
            onNext={nextMonth}
            supportTotal={supportTotal}
            onSupportClick={() => setShowSupportModal(true)}
          />
        </div>

        {/* AI Insights */}
        {!loading && insights.length > 0 && (
          <div className="anim-up-2">
            <InsightCards insights={insights} />
          </div>
        )}

        {/* 수입 후보 확인 */}
        {!loading && incomeCandidates.length > 0 && (
          <div className="anim-up-2">
            <IncomeCandidateBanner
              candidates={incomeCandidates}
              onConfirm={handleIncomeConfirm}
              onDismiss={handleIncomeDismiss}
            />
          </div>
        )}

        {/* 지원 항목 후보 확인 */}
        {!loading && supportCandidates.length > 0 && (
          <div className="anim-up-2">
            <SupportItemBanner
              candidates={supportCandidates}
              onConfirm={handleSupportConfirm}
              onDismiss={handleSupportDismiss}
            />
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
            <CalendarTab
              transactions={transactions}
              year={year}
              month={month}
              customCats={customCats}
              onCatsChange={setCustomCats}
              onDelete={handleDelete}
              onCategoryChange={handleCategoryChange}
              onBulkCategoryChange={handleBulkCategoryChange}
              onRecurringChange={handleRecurringChange}
              onExcludedChange={handleExcludedChange}
              onBulkExcludedChange={handleBulkExcludedChange}
              onMetaChange={handleMetaChange}
              onAmountChange={handleAmountChange}
              onSortOrderChange={handleSortOrderChange}
              onHiddenChange={handleHiddenChange}
              onDateChange={handleDateChange}
            />
          </div>
        ) : tab === 'category' ? (
          <div className="anim-up-4">
            <CategoryBreakdown transactions={activeTransactions} prevTransactions={prevTransactions.filter(t => !t.is_excluded)} customCats={customCats} />
          </div>
        ) : (
          <div className="anim-up-4 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(true)}
                className="glass text-xs rounded-xl px-3 py-2 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>⚙️</span>
                <span>위젯 관리</span>
              </button>
            </div>
            <MonthlyTrendChart />
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
              customCats={customCats}
              onCategoryChange={handleCategoryChange}
              widgets={widgets}
              onWidgetSave={handleWidgetSave}
              onWidgetDelete={handleWidgetDelete}
              onAmountChange={handleAmountChange}
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

      {showSupportModal && (
        <SupportItemsModal
          items={supportItems}
          year={year}
          month={month}
          transactions={transactions}
          onAdd={item => setSupportItems(prev => [...prev, item])}
          onDelete={id => setSupportItems(prev => prev.filter(i => i.id !== id))}
          onClose={() => setShowSupportModal(false)}
        />
      )}
      {showForm && <TransactionForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />}
      {showChat && <ChatModal year={year} month={month} onClose={() => setShowChat(false)} onDataChange={load} />}
      {showImport && <CsvImport onImport={handleImport} onClose={() => setShowImport(false)} customCats={customCats} />}
      {showLearnedCategories && <LearnedCategoriesModal onClose={() => setShowLearnedCategories(false)} />}
      {showCoach && (
        <CoachModal
          transactions={transactions}
          year={year}
          month={month}
          onClose={() => setShowCoach(false)}
        />
      )}
      {showSettings && (
        <SettingsModal
          widgets={widgets}
          customCats={customCats}
          onWidgetSave={handleWidgetSave}
          onWidgetDelete={handleWidgetDelete}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
