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
  const { error } = await supabase.from('transactions').insert(txs)
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
