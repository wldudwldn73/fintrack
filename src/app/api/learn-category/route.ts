import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { merchant, category } = await req.json() as { merchant: string; category: string }
  if (!merchant?.trim() || !category) return NextResponse.json({ ok: false })

  const supabase = await createServerSupabaseClient()
  await supabase
    .from('merchant_categories')
    .upsert({ merchant: merchant.trim(), category }, { onConflict: 'merchant' })

  return NextResponse.json({ ok: true })
}
