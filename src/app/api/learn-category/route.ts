import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('merchant_categories')
    .select('merchant, category')
    .order('merchant', { ascending: true })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { merchant, category } = await req.json() as { merchant: string; category: string }
  if (!merchant?.trim() || !category) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  await supabase
    .from('merchant_categories')
    .upsert({ merchant: merchant.trim(), category }, { onConflict: 'merchant' })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { merchant, category } = await req.json() as { merchant: string; category: string }
  if (!merchant?.trim() || !category) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  await supabase
    .from('merchant_categories')
    .update({ category })
    .eq('merchant', merchant.trim())

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchant = searchParams.get('merchant')
  if (!merchant) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  await supabase.from('merchant_categories').delete().eq('merchant', merchant)

  return NextResponse.json({ ok: true })
}
