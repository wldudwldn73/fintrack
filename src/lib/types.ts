export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface TransactionInsert {
  type: TransactionType
  amount: number
  category: string
  description?: string
  date: string
}

export const EXPENSE_CATEGORIES = ['식비', '카페', '편의점', '교통', '쇼핑', '구독', '주거', '의료', '문화', '교육', '기타'] as const
export const INCOME_CATEGORIES = ['급여', '부업', '투자', '기타'] as const
