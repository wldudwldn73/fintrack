import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    },
  )
}

export async function GET(req: NextRequest) {
  const supabase = makeClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  let query = supabase.from('custom_categories').select('id, name, type').eq('user_id', user.id).order('created_at')
  if (type) query = query.eq('type', type)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = makeClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type } = await req.json() as { name: string; type: string }
  if (!name?.trim() || !type) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ user_id: user.id, name: name.trim(), type })
    .select('id, name, type')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = makeClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('custom_categories').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
