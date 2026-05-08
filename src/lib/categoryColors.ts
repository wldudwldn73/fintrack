export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  식비:   { bg: 'bg-orange-500/15',  text: 'text-orange-400',   dot: '#f97316' },
  카페:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',    dot: '#f59e0b' },
  편의점: { bg: 'bg-teal-500/15',    text: 'text-teal-400',     dot: '#14b8a6' },
  교통:   { bg: 'bg-blue-500/15',    text: 'text-blue-400',     dot: '#3b82f6' },
  쇼핑:   { bg: 'bg-purple-500/15',  text: 'text-purple-400',   dot: '#a855f7' },
  구독:   { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',   dot: '#6366f1' },
  주거:   { bg: 'bg-green-500/15',   text: 'text-green-400',    dot: '#22c55e' },
  의료:   { bg: 'bg-red-500/15',     text: 'text-red-400',      dot: '#ef4444' },
  문화:   { bg: 'bg-pink-500/15',    text: 'text-pink-400',     dot: '#ec4899' },
  교육:   { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',   dot: '#eab308' },
  급여:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400',  dot: '#10b981' },
  부업:   { bg: 'bg-lime-500/15',    text: 'text-lime-400',     dot: '#84cc16' },
  투자:   { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',     dot: '#06b6d4' },
  기타:   { bg: 'bg-zinc-500/15',    text: 'text-zinc-400',     dot: '#9ca3af' },
}

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['기타']
}
