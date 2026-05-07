import { Transaction } from './types'

export interface Insight {
  type: 'info' | 'warning' | 'tip' | 'psychology'
  text: string
  emoji: string
}

// 이 함수를 AI API로 교체하면 전체 인사이트를 AI 기반으로 전환 가능
export function generateInsights(current: Transaction[], prev: Transaction[]): Insight[] {
  const insights: Insight[] = []

  const expenses = current.filter(t => t.type === 'expense')
  const prevExpenses = prev.filter(t => t.type === 'expense')
  if (expenses.length === 0) return []

  const total = expenses.reduce((s, t) => s + t.amount, 0)
  const prevTotal = prevExpenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})

  const prevByCategory = prevExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  // 지난달 대비 총 지출
  if (prevTotal > 0) {
    const changePct = ((total - prevTotal) / prevTotal) * 100
    if (changePct >= 10) {
      insights.push({ type: 'warning', emoji: '📈', text: `지난달 대비 지출이 ${changePct.toFixed(0)}% 증가했어요.` })
    } else if (changePct <= -10) {
      insights.push({ type: 'tip', emoji: '📉', text: `지난달 대비 지출이 ${Math.abs(changePct).toFixed(0)}% 감소했어요. 잘 하고 있어요!` })
    }
  }

  // 지출 1위 카테고리
  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0]
    const pct = ((topAmt / total) * 100).toFixed(0)
    insights.push({ type: 'info', emoji: '🏆', text: `이번 달 지출 1위는 ${topCat}이에요. 전체의 ${pct}%인 ${topAmt.toLocaleString('ko-KR')}원이에요.` })
  }

  // 고정지출 건수
  const recurring = expenses.filter(t => t.is_recurring)
  if (recurring.length > 0) {
    const recurringTotal = recurring.reduce((s, t) => s + t.amount, 0)
    insights.push({ type: 'info', emoji: '🔄', text: `반복 결제가 ${recurring.length}건 있어요. 총 ${recurringTotal.toLocaleString('ko-KR')}원이에요.` })
  }

  // 특정 카테고리 급증 감지
  if (prevTotal > 0) {
    for (const [cat, amt] of sorted.slice(0, 4)) {
      const prev = prevByCategory[cat] || 0
      if (prev > 0 && (amt - prev) / prev >= 0.25) {
        insights.push({ type: 'warning', emoji: '⚠️', text: `이번 달 ${cat} 지출이 지난달보다 ${(((amt - prev) / prev) * 100).toFixed(0)}% 증가했어요.` })
        break
      }
    }
  }

  // 소비 심리 분석
  const psycho = getPsychologyInsight(byCategory, total, expenses)
  if (psycho) insights.push(psycho)

  return insights
}

function getPsychologyInsight(
  byCategory: Record<string, number>,
  total: number,
  expenses: Transaction[]
): Insight | null {
  const pct = (cat: string) => ((byCategory[cat] || 0) / total) * 100

  if (pct('편의점') > 12) {
    return { type: 'psychology', emoji: '🧠', text: '최근 편의점 소비가 증가했어요. 스트레스 기반 소비 패턴일 가능성이 있어요.' }
  }
  if (pct('쇼핑') > 30) {
    return { type: 'psychology', emoji: '🧠', text: `쇼핑이 전체 지출의 ${pct('쇼핑').toFixed(0)}%예요. 구매 전 하루 기다려보는 습관이 도움돼요.` }
  }
  if (pct('카페') > 15) {
    return { type: 'psychology', emoji: '🧠', text: '카페 지출 비중이 높아요. 텀블러로 절약해볼 수 있어요.' }
  }
  const subCount = expenses.filter(t => t.category === '구독' && t.is_recurring).length
  if (subCount >= 3) {
    return { type: 'psychology', emoji: '🧠', text: `구독 서비스가 ${subCount}건이에요. 사용하지 않는 서비스가 있을 수 있어요.` }
  }
  return null
}

export function getCategoryComment(category: string, pct: number, changePct: number | null): string {
  if (changePct !== null && changePct >= 20) return `지난달보다 ${changePct.toFixed(0)}% 늘었어요`
  if (changePct !== null && changePct <= -20) return `지난달보다 ${Math.abs(changePct).toFixed(0)}% 줄었어요 👍`

  const comments: Record<string, string> = {
    식비: pct > 30 ? '지출 비중이 높아요' : '적정 수준이에요',
    카페: pct > 15 ? '카페 지출이 꽤 많아요' : '적당한 카페인 비용이에요',
    편의점: pct > 12 ? '편의점 방문이 잦아요' : '가볍게 쓰고 있어요',
    쇼핑: pct > 25 ? '쇼핑에 많이 투자했네요' : '쇼핑 지출 양호해요',
    구독: '정기 결제 중이에요',
    교통: '이동에 쓴 비용이에요',
    주거: '주거 유지 비용이에요',
    의료: '건강에 투자했어요',
    문화: '여가에 투자했어요',
    교육: '자기계발에 투자했어요',
    투자: '미래를 위한 투자예요',
    기타: '기타 지출이에요',
  }
  return comments[category] ?? ''
}
