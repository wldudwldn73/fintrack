import { supabase } from './supabase'

export interface CategoryWidget {
  id: string
  name: string
  emoji: string
  categories: string[]
  sort_order: number
}

type WidgetInput = Omit<CategoryWidget, 'id'> & { id?: string }

export async function getCategoryWidgets(): Promise<CategoryWidget[]> {
  const { data, error } = await supabase
    .from('category_widgets')
    .select('id, name, emoji, categories, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertCategoryWidget(w: WidgetInput): Promise<CategoryWidget> {
  const { data, error } = await supabase
    .from('category_widgets')
    .upsert(w)
    .select('id, name, emoji, categories, sort_order')
    .single()
  if (error) throw error
  return data
}

export async function deleteCategoryWidget(id: string): Promise<void> {
  const { error } = await supabase.from('category_widgets').delete().eq('id', id)
  if (error) throw error
}
