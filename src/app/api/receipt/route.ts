import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import sharp from 'sharp'
import { EXPENSE_CATEGORIES } from '@/lib/types'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return Response.json({ error: '이미지가 없습니다' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const original = Buffer.from(new Uint8Array(bytes))
  let imageBuffer: Buffer = original

  try {
    const resized = await sharp(original)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    imageBuffer = resized
  } catch {
    // 리사이즈 실패 시 원본 사용
  }

  const base64 = imageBuffer.toString('base64')
  const today = new Date().toISOString().slice(0, 10)
  const categories = EXPENSE_CATEGORIES.join(', ')

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    {
      inlineData: { mimeType: 'image/jpeg', data: base64 },
    },
    `이 영수증 이미지를 분석해서 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "storeName": "가맹점명",
  "amount": 합계금액(숫자, 원 단위),
  "date": "YYYY-MM-DD",
  "category": "다음 중 하나: ${categories}",
  "items": [{ "name": "품목명", "price": 숫자 }]
}

규칙:
- amount는 합계(total) 금액
- date가 불명확하면 오늘(${today}) 사용
- category는 가맹점 업종에 맞게 선택
- items가 없으면 빈 배열 []`,
  ])

  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return Response.json({ error: '영수증을 인식하지 못했습니다' }, { status: 422 })
  }

  try {
    const data = JSON.parse(jsonMatch[0])
    return Response.json(data)
  } catch {
    return Response.json({ error: '응답 파싱에 실패했습니다' }, { status: 422 })
  }
}
