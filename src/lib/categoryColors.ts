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
  보험:   { bg: 'bg-sky-500/15',     text: 'text-sky-400',      dot: '#0ea5e9' },
  적금:   { bg: 'bg-violet-500/15',  text: 'text-violet-400',   dot: '#8b5cf6' },
  기부금: { bg: 'bg-rose-500/15',    text: 'text-rose-400',     dot: '#f43f5e' },
  카드대금: { bg: 'bg-slate-500/15', text: 'text-slate-400',    dot: '#64748b' },
  기타:   { bg: 'bg-zinc-500/15',    text: 'text-zinc-400',     dot: '#9ca3af' },
}

export const CUSTOM_COLOR_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  rose:    { bg: 'bg-rose-500/15',    text: 'text-rose-400',    dot: '#f43f5e' },
  orange:  { bg: 'bg-orange-500/15',  text: 'text-orange-400',  dot: '#f97316' },
  amber:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: '#f59e0b' },
  yellow:  { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  dot: '#eab308' },
  lime:    { bg: 'bg-lime-500/15',    text: 'text-lime-400',    dot: '#84cc16' },
  green:   { bg: 'bg-green-500/15',   text: 'text-green-400',   dot: '#22c55e' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: '#10b981' },
  teal:    { bg: 'bg-teal-500/15',    text: 'text-teal-400',    dot: '#14b8a6' },
  cyan:    { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    dot: '#06b6d4' },
  sky:     { bg: 'bg-sky-500/15',     text: 'text-sky-400',     dot: '#0ea5e9' },
  blue:    { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: '#3b82f6' },
  indigo:  { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  dot: '#6366f1' },
  violet:  { bg: 'bg-violet-500/15',  text: 'text-violet-400',  dot: '#8b5cf6' },
  purple:  { bg: 'bg-purple-500/15',  text: 'text-purple-400',  dot: '#a855f7' },
  pink:    { bg: 'bg-pink-500/15',    text: 'text-pink-400',    dot: '#ec4899' },
  slate:   { bg: 'bg-slate-500/15',   text: 'text-slate-400',   dot: '#64748b' },
  zinc:    { bg: 'bg-zinc-500/15',    text: 'text-zinc-400',    dot: '#9ca3af' },
}

export const COLOR_OPTIONS: { key: string; dot: string }[] =
  Object.entries(CUSTOM_COLOR_STYLES).map(([key, v]) => ({ key, dot: v.dot }))

export function getCategoryColor(category: string, colorKey?: string) {
  if (colorKey && CUSTOM_COLOR_STYLES[colorKey]) return CUSTOM_COLOR_STYLES[colorKey]
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['기타']
}
