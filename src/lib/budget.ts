import { supabase } from './supabase'
import { Budget, BudgetUpsert } from './types'

export async function getBudgets(year: number, month: number): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('year', year)
    .eq('month', month)

  if (error) throw error
  return data ?? []
}

export async function upsertBudget(b: BudgetUpsert): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .upsert(b, { onConflict: 'user_id,year,month,category' })

  if (error) throw error
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}
