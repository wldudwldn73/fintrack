import { supabase } from './supabase'
import { Transaction, TransactionInsert } from './types'

export async function getTransactions(year: number, month: number): Promise<Transaction[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .eq('deleted', false)
    .order('date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addTransaction(tx: TransactionInsert): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addTransactions(txs: TransactionInsert[]): Promise<void> {
  if (txs.length === 0) return

  // 날짜 범위 내 기존 항목 조회해서 서버 측 중복 제거
  const dates = txs.map(t => t.date).sort()
  const { data: existing } = await supabase
    .from('transactions')
    .select('date, amount, type, description')
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
    .eq('deleted', false)

  const existingKeys = new Set(
    (existing ?? []).map(e => `${e.date}|${e.amount}|${e.type}|${e.description ?? ''}`)
  )
  const deduped = txs.filter(
    t => !existingKeys.has(`${t.date}|${t.amount}|${t.type}|${t.description ?? ''}`)
  )
  if (deduped.length === 0) return

  const { error } = await supabase.from('transactions').insert(deduped)
  if (error) throw error
}

export async function updateTransactionCategory(id: string, category: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ category }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionCategoryByKeyword(
  keyword: string,
  category: string,
  scope: 'all' | 'current_month',
  year?: number,
  month?: number,
): Promise<string[]> {
  let query = supabase
    .from('transactions')
    .update({ category })
    .ilike('description', `%${keyword}%`)
    .eq('deleted', false)
    .select('id')

  if (scope === 'current_month' && year !== undefined && month !== undefined) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to   = new Date(year, month, 0).toISOString().slice(0, 10)
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function updateTransactionRecurring(id: string, is_recurring: boolean): Promise<void> {
  const { error } = await supabase.from('transactions').update({ is_recurring }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionExcluded(id: string, is_excluded: boolean): Promise<void> {
  const { error } = await supabase.from('transactions').update({ is_excluded }).eq('id', id)
  if (error) throw error
}

export async function excludeTransactionsByKeyword(
  keyword: string,
  scope: 'all' | 'current_month',
  year?: number,
  month?: number,
): Promise<string[]> {
  let query = supabase
    .from('transactions')
    .update({ is_excluded: true })
    .ilike('description', `%${keyword}%`)
    .eq('is_excluded', false)
    .eq('deleted', false)
    .select('id')

  if (scope === 'current_month' && year !== undefined && month !== undefined) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to   = new Date(year, month, 0).toISOString().slice(0, 10)
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function updateTransactionType(id: string, type: string, category: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ type, category }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionAmount(id: string, amount: number): Promise<void> {
  const { error } = await supabase.from('transactions').update({ amount }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionDate(id: string, date: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ date }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionHidden(id: string, is_hidden: boolean): Promise<void> {
  const { error } = await supabase.from('transactions').update({ is_hidden }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionSortOrders(updates: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(updates.map(({ id, sort_order }) =>
    supabase.from('transactions').update({ sort_order }).eq('id', id)
  ))
}

export async function updateTransactionMeta(
  id: string,
  updates: { description?: string | null; memo?: string | null },
): Promise<void> {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id)
  if (error) throw error
}

/** Soft delete — sets deleted=true so the row stays in the DB */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ deleted: true }).eq('id', id)
  if (error) throw error
}

export async function getTransactionsByDateRange(from: string, to: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .eq('deleted', false)
  if (error) throw error
  return data ?? []
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('deleted', false)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}
