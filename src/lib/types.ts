export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  memo: string | null
  payment_method: string | null
  institution: string | null
  is_recurring: boolean
  is_excluded: boolean
  is_hidden: boolean
  deleted: boolean
  sort_order: number
  date: string
  created_at: string
}

export interface TransactionInsert {
  type: TransactionType
  amount: number
  category: string
  description?: string
  memo?: string
  payment_method?: string
  institution?: string
  is_recurring?: boolean
  date: string
}

export interface Budget {
  id: string
  year: number
  month: number
  category: string
  amount: number
}

export interface BudgetUpsert {
  year: number
  month: number
  category: string
  amount: number
}

// 카테고리만으로 고정지출 확정 가능한 경우
export const RECURRING_CATEGORIES = new Set(['구독', '주거'])

export const EXPENSE_CATEGORIES = ['식비', '카페', '편의점', '교통', '쇼핑', '구독', '주거', '의료', '문화', '교육', '투자', '보험', '적금', '기부금', '카드대금', '기타'] as const
export const INCOME_CATEGORIES = ['급여', '부업', '투자', '기타'] as const
