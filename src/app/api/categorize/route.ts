import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import { getRuleBasedCategory } from '@/lib/categoryRules'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { transactions } = await req.json()
  if (!transactions?.length) return Response.json({ categories: [] })

  const results: (string | null)[] = transactions.map(() => null)

  // Step 1: 룰 기반 분류
  for (let i = 0; i < transactions.length; i++) {
    const { description, type } = transactions[i]
    const cat = getRuleBasedCategory(description ?? '', type ?? 'expense')
    if (cat) results[i] = cat
  }

  // Step 2: DB에서 학습된 분류 조회
  const dbIndices = results.map((r, i) => r === null ? i : -1).filter(i => i >= 0)
  if (dbIndices.length > 0) {
    const merchants = [...new Set(dbIndices.map(i => (transactions[i].description ?? '').trim()).filter(Boolean))]
    if (merchants.length > 0) {
      const { data } = await supabase
        .from('merchant_categories')
        .select('merchant, category')
        .in('merchant', merchants)
      if (data) {
        const map = new Map(data.map((d: { merchant: string; category: string }) => [d.merchant, d.category]))
        for (const i of dbIndices) {
          const merchant = (transactions[i].description ?? '').trim()
          const cat = map.get(merchant)
          if (cat) results[i] = cat as string
        }
      }
    }
  }

  // Step 3: 아직 미분류 항목만 AI로 처리
  const aiIndices = results.map((r, i) => r === null ? i : -1).filter(i => i >= 0)
  if (aiIndices.length > 0) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const list = aiIndices.map((i, j) => {
      const t = transactions[i]
      return `${j}: [${t.type === 'income' ? '수입' : '지출'} ${t.amount.toLocaleString()}원] ${t.description || '내용없음'}`
    }).join('\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `거래 내역을 보고 카테고리를 분류하세요.
사용 가능한 카테고리: 식비, 카페, 편의점, 교통, 쇼핑, 구독, 주거, 의료, 문화, 교육, 급여, 부업, 투자, 보험, 적금, 기부금, 카드대금, 기타

반드시 JSON 형식으로 반환: {"categories": ["카테고리1", "카테고리2", ...]}`,
        },
        { role: 'user', content: list },
      ],
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const aiCategories: string[] = JSON.parse(raw).categories ?? []

    const upsertRows: { merchant: string; category: string }[] = []
    for (let j = 0; j < aiIndices.length; j++) {
      const i = aiIndices[j]
      const cat = aiCategories[j] ?? '기타'
      results[i] = cat
      const merchant = (transactions[i].description ?? '').trim()
      if (merchant) upsertRows.push({ merchant, category: cat })
    }

    if (upsertRows.length > 0) {
      await supabase.from('merchant_categories').upsert(upsertRows, { onConflict: 'merchant' })
    }
  }

  return Response.json({ categories: results.map(r => r ?? '기타') })
}
