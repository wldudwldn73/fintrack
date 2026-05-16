import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [] })

  const { data } = await supabase
    .from('merchant_categories')
    .select('merchant, category')
    .eq('user_id', user.id)
    .order('merchant', { ascending: true })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { merchant, category } = await req.json() as { merchant: string; category: string }
  if (!merchant?.trim() || !category) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  await supabase
    .from('merchant_categories')
    .upsert({ merchant: merchant.trim(), category, user_id: user.id }, { onConflict: 'merchant,user_id' })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { merchant, category } = await req.json() as { merchant: string; category: string }
  if (!merchant?.trim() || !category) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  await supabase
    .from('merchant_categories')
    .update({ category })
    .eq('merchant', merchant.trim())
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchant = searchParams.get('merchant')
  if (!merchant) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  await supabase
    .from('merchant_categories')
    .delete()
    .eq('merchant', merchant)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
