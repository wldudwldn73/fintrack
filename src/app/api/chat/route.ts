import Groq from 'groq-sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: '새로운 거래 내역을 추가합니다. 사용자가 내역 추가를 요청하면 이 도구를 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'expense'], description: '수입(income) 또는 지출(expense)' },
          amount: { type: 'number', description: '금액 (양수)' },
          category: { type: 'string', description: '카테고리 (식비/카페/편의점/교통/쇼핑/구독/주거/의료/문화/교육/투자/보험/적금/급여/부업/기타)' },
          description: { type: 'string', description: '거래 내용·상호명' },
          date: { type: 'string', description: '날짜 (YYYY-MM-DD 형식)' },
          memo: { type: 'string', description: '메모 (선택)' },
          is_recurring: { type: 'boolean', description: '고정 지출 여부 (구독·렌트 등)' },
        },
        required: ['type', 'amount', 'category', 'date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: '거래 내역 항목을 삭제합니다.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '삭제할 거래의 ID' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: '거래 내역 항목을 수정합니다. 카테고리, 내용, 금액, 날짜를 변경할 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '수정할 거래의 ID' },
          category: { type: 'string', description: '새 카테고리 (식비/교통/쇼핑/주거/의료/문화/교육/급여/투자/기타)' },
          description: { type: 'string', description: '새 내용/설명' },
          amount: { type: 'number', description: '새 금액' },
          date: { type: 'string', description: '새 날짜 (YYYY-MM-DD)' }
        },
        required: ['id']
      }
    }
  }
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, args: Record<string, unknown>, supabase: SupabaseClient<any>): Promise<string> {
  if (name === 'add_transaction') {
    const { error } = await supabase.from('transactions').insert({
      type: args.type,
      amount: args.amount,
      category: args.category,
      description: args.description ?? null,
      date: args.date,
      memo: args.memo ?? null,
      is_recurring: args.is_recurring ?? false,
    })
    return error ? `추가 실패: ${error.message}` : '추가 성공'
  }
  if (name === 'delete_transaction') {
    const { error } = await supabase.from('transactions').delete().eq('id', args.id as string)
    return error ? `삭제 실패: ${error.message}` : '삭제 성공'
  }
  if (name === 'update_transaction') {
    const { id, ...updates } = args
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v != null))
    const { error } = await supabase.from('transactions').update(clean).eq('id', id as string)
    return error ? `수정 실패: ${error.message}` : '수정 성공'
  }
  return '알 수 없는 도구'
}

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const supabase = await createServerSupabaseClient()
  const { message, year, month, history } = await req.json()

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0

  const txSummary = transactions?.map(t =>
    `[${t.date}] ${t.type === 'income' ? '수입' : '지출'} ${t.amount.toLocaleString()}원 / ${t.category}${t.description ? ` / ${t.description}` : ''} (ID: ${t.id})`
  ).join('\n') ?? '내역 없음'

  const systemPrompt = `당신은 개인 가계부 AI 어시스턴트입니다. 사용자의 ${year}년 ${month}월 거래 내역을 분석하고 요청 시 직접 수정·삭제할 수 있습니다.

## ${year}년 ${month}월 요약
- 총 수입: ${income.toLocaleString()}원
- 총 지출: ${expense.toLocaleString()}원
- 잔액: ${(income - expense).toLocaleString()}원
- 거래 건수: ${transactions?.length ?? 0}건

## 거래 내역 (ID 포함)
${txSummary}

간결하고 친근하게 한국어로 답변하세요. 금액은 원 단위로 표시하세요.
추가·수정·삭제 요청은 반드시 도구를 사용해 직접 처리한 후 결과를 알려주세요.
수입(급여, 부업, 투자수익 등)과 지출 모두 add_transaction 도구로 추가할 수 있습니다.
"넣어줘", "추가해줘", "기록해줘" 같은 요청도 모두 add_transaction을 사용하세요.`

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        interface ToolCallBuffer { id: string; name: string; arguments: string }
        const toolCallBuffer: ToolCallBuffer[] = []
        let hasToolCalls = false

        const firstStream = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          stream: true,
          tools,
          tool_choice: 'auto',
          messages,
        })

        for await (const chunk of firstStream) {
          const delta = chunk.choices[0]?.delta
          if (!delta) continue

          if (delta.tool_calls) {
            hasToolCalls = true
            for (const tc of delta.tool_calls) {
              const idx = typeof tc.index === 'number' ? tc.index : 0
              if (!toolCallBuffer[idx]) toolCallBuffer[idx] = { id: '', name: '', arguments: '' }
              if (tc.id) toolCallBuffer[idx].id = tc.id
              if (tc.function?.name) toolCallBuffer[idx].name += tc.function.name
              if (tc.function?.arguments) toolCallBuffer[idx].arguments += tc.function.arguments
            }
          } else if (delta.content) {
            controller.enqueue(encoder.encode(delta.content))
          }
        }

        if (!hasToolCalls) {
          controller.close()
          return
        }

        // 도구 실행
        let dataChanged = false
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCallBuffer.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments }
          }))
        })

        for (const tc of toolCallBuffer) {
          const args = JSON.parse(tc.arguments) as Record<string, unknown>
          const result = await executeTool(tc.name, args, supabase)
          if (result.includes('성공')) dataChanged = true
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }

        // 도구 실행 후 최종 응답 스트리밍
        const finalStream = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          stream: true,
          messages,
        })

        for await (const chunk of finalStream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }

        if (dataChanged) controller.enqueue(encoder.encode('\n[DATA_CHANGED]'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    }
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
