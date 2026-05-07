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

export async function updateTransactionRecurring(id: string, is_recurring: boolean): Promise<void> {
  const { error } = await supabase.from('transactions').update({ is_recurring }).eq('id', id)
  if (error) throw error
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function getTransactionsByDateRange(from: string, to: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  return data ?? []
}
