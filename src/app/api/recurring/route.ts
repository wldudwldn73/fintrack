import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ recurring: [] }, { status: 401 })

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await supabase
    .from('transactions')
    .select('description, category, amount, date')
    .eq('type', 'expense')
    .gte('date', sixMonthsAgo.toISOString().slice(0, 10))

  if (!data?.length) return NextResponse.json({ recurring: [] })

  const groups: Record<string, { months: Set<string>; amounts: number[]; category: string; description: string }> = {}

  for (const tx of data) {
    const key = (tx.description?.trim() || tx.category).toLowerCase()
    if (!groups[key]) {
      groups[key] = { months: new Set(), amounts: [], category: tx.category, description: tx.description || tx.category }
    }
    groups[key].months.add(tx.date.slice(0, 7))
    groups[key].amounts.push(tx.amount)
  }

  const recurring = Object.values(groups)
    .filter(g => g.months.size >= 2)
    .map(g => ({
      description: g.description,
      category: g.category,
      avgAmount: Math.round(g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length),
      monthCount: g.months.size,
    }))
    .sort((a, b) => b.avgAmount - a.avgAmount)

  return NextResponse.json({ recurring })
}
