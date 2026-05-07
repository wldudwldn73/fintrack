import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { transactions } = await req.json()
  if (!transactions?.length) return Response.json({ categories: [] })

  const list = transactions.map((t: { description: string; amount: number; type: string }, i: number) =>
    `${i}: [${t.type === 'income' ? '수입' : '지출'} ${t.amount.toLocaleString()}원] ${t.description || '내용없음'}`
  ).join('\n')

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `거래 내역을 보고 카테고리를 분류하세요.
사용 가능한 카테고리: 식비, 교통, 쇼핑, 주거, 의료, 문화, 교육, 급여, 투자, 기타

분류 기준:
- 수입이고 100만원 이상이면 급여
- 카페, 스타벅스, 음식점, 편의점, GS25, CU, 배달, 배민, 쿠팡이츠 → 식비
- 마트, 이마트, 홈플러스, 롯데마트, 코스트코 → 식비
- 지하철, 버스, 택시, 카카오T, 주유, 고속도로, KTX → 교통
- 쿠팡, 네이버쇼핑, 11번가, G마켓, 올리브영, 무신사 → 쇼핑
- 월세, 관리비, 전기세, 가스비, 수도세, 인터넷 → 주거
- 병원, 약국, 의원, 한의원, 치과 → 의료
- 넷플릭스, 유튜브, 멜론, 영화, 게임, 스포티파이 → 문화
- 학원, 과외, 교재, 수강료 → 교육
- 주식, 펀드, 보험료, 금융상품, 증권 → 투자
- 나머지 → 기타

반드시 JSON 형식으로 반환: {"categories": ["카테고리1", "카테고리2", ...]}`
      },
      { role: 'user', content: list }
    ]
  })

  const raw = completion.choices[0].message.content ?? '{}'
  const result = JSON.parse(raw)
  return Response.json({ categories: result.categories ?? [] })
}
