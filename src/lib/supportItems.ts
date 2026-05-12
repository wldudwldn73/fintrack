import { supabase } from './supabase'

export const SUPPORT_KEYWORDS = ['용돈', '지원', '대납', '후원', '보조', '지원금']

const DISMISSED_KEY = 'fintrack_dismissed_support'

export function loadDismissedSupport(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

export function saveDismissedSupport(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
  } catch {}
}

export interface SupportItem {
  id: string
  transaction_id: string | null
  source_name: string | null
  amount: number
  category: string
  date: string
  created_at: string
}

export async function getSupportItems(year: number, month: number): Promise<SupportItem[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('support_items')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addSupportItem(item: {
  transaction_id?: string
  source_name?: string
  amount: number
  category: string
  date: string
}): Promise<void> {
  const { error } = await supabase.from('support_items').insert(item)
  if (error) throw error
}

export async function deleteSupportItem(id: string): Promise<void> {
  const { error } = await supabase.from('support_items').delete().eq('id', id)
  if (error) throw error
}
