export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  식비:  { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: '#f97316' },
  카페:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: '#f59e0b' },
  편의점: { bg: 'bg-teal-100',   text: 'text-teal-700',    dot: '#14b8a6' },
  교통:  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: '#3b82f6' },
  쇼핑:  { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: '#a855f7' },
  구독:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: '#6366f1' },
  주거:  { bg: 'bg-green-100',   text: 'text-green-700',   dot: '#22c55e' },
  의료:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: '#ef4444' },
  문화:  { bg: 'bg-pink-100',    text: 'text-pink-700',    dot: '#ec4899' },
  교육:  { bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: '#eab308' },
  급여:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#10b981' },
  부업:  { bg: 'bg-lime-100',    text: 'text-lime-700',    dot: '#84cc16' },
  투자:  { bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: '#06b6d4' },
  기타:  { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: '#9ca3af' },
}

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['기타']
}
