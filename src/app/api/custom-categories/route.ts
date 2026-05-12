import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  let query = supabase
    .from('custom_categories')
    .select('id, name, type, color')
    .eq('user_id', user.id)
    .order('created_at')
  if (type) query = query.eq('type', type)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, color = 'zinc' } = await req.json() as { name: string; type: string; color?: string }
  if (!name?.trim() || !type) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ user_id: user.id, name: name.trim(), type, color })
    .select('id, name, type, color')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, color } = await req.json() as { id: string; color: string }
  if (!id || !color) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  await supabase.from('custom_categories').update({ color }).eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('custom_categories').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
