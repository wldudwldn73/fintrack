'use client'

import { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
  year: number
  month: number
}

function getWeekOfMonth(dateStr: string, year: number, month: number) {
  const d = new Date(dateStr + 'T00:00:00')
  const firstDay = new Date(year, month - 1, 1).getDay()
  return Math.ceil((d.getDate() + firstDay) / 7)
}

function getWeekLabel(week: number, year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const start = new Date(firstDay)
  start.setDate(1 + (week - 1) * 7 - firstDay.getDay())
  if (start.getMonth() !== month - 1) start.setDate(1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  if (end.getMonth() !== month - 1) end.setDate(new Date(year, month, 0).getDate())
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${week}주 (${fmt(start)}~${fmt(end)})`
}

export default function Dashboard({ transactions, year, month }: Props) {
  const expenses = transactions.filter(t => t.type === 'expense')

  // 주별 지출
  const weeklyMap: Record<number, number> = {}
  for (const t of expenses) {
    const w = getWeekOfMonth(t.date, year, month)
    weeklyMap[w] = (weeklyMap[w] ?? 0) + t.amount
  }
  const weeks = Object.entries(weeklyMap)
    .map(([w, amt]) => ({ week: Number(w), amount: amt }))
    .sort((a, b) => a.week - b.week)
  const maxWeekly = Math.max(...weeks.map(w => w.amount), 1)

  // 결제수단 × 기관별 그룹
  type MethodGroup = {
    key: string
    payment_method: string
    institution: string | null
    total: number
    items: { description: string; amount: number }[]
  }
  const methodMap: Record<string, MethodGroup> = {}

  for (const t of expenses) {
    const pm = t.payment_method ?? '직접입력'
    const inst = t.institution ?? null
    const key = `${inst ?? ''}__${pm}`
    if (!methodMap[key]) {
      methodMap[key] = { key, payment_method: pm, institution: inst, total: 0, items: [] }
    }
    methodMap[key].total += t.amount
    const desc = t.description ?? '(내역없음)'
    const existing = methodMap[key].items.find(i => i.description === desc)
    if (existing) existing.amount += t.amount
    else methodMap[key].items.push({ description: desc, amount: t.amount })
  }

  const methods = Object.values(methodMap)
    .sort((a, b) => b.total - a.total)
    .map(m => ({ ...m, items: m.items.sort((a, b) => b.amount - a.amount) }))

  if (expenses.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">지출 내역이 없어요</div>
  }

  return (
    <div className="space-y-4">
      {/* 주별 지출 */}
      <div className="bg-white rounded-2xl px-4 py-5 shadow-sm">
        <p className="text-xs text-gray-400 mb-3">주별 지출</p>
        <div className="space-y-2.5">
          {weeks.map(({ week, amount }) => (
            <div key={week}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">{getWeekLabel(week, year, month)}</span>
                <span className="text-xs font-semibold text-gray-800">{amount.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full transition-all duration-500"
                  style={{ width: `${(amount / maxWeekly) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 결제수단별 내역 */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400 px-1">결제수단별</p>
        {methods.map(m => (
          <div key={m.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{m.payment_method}</span>
                {m.institution && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m.institution}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-red-500">-{m.total.toLocaleString('ko-KR')}원</span>
                <span className="text-xs text-gray-400 ml-1.5">{m.items.length}곳</span>
              </div>
            </div>
            {/* 하위 항목 */}
            <div className="divide-y divide-gray-50">
              {m.items.slice(0, 5).map((item, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-sm text-gray-600 truncate">{item.description}</span>
                  <span className="text-sm text-gray-700 ml-2 shrink-0">{item.amount.toLocaleString('ko-KR')}원</span>
                </div>
              ))}
              {m.items.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-400">+{m.items.length - 5}개 더</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
