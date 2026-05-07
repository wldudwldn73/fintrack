import * as XLSX from 'xlsx'
import { TransactionInsert } from './types'
import { getRuleBasedCategory } from './categoryRules'

function parseDate(raw: string | number): string {
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = String(raw).trim()
  // YYYYMMDD (구분자 없음)
  if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  // YYYY.MM.DD / YYYY-MM-DD / YYYY/MM/DD (시간 포함 가능)
  const match = str.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  throw new Error(`날짜 형식을 인식할 수 없습니다: ${raw}`)
}

function parseAmount(raw: string | number | undefined): number {
  if (raw === undefined || raw === null || raw === '') return 0
  if (typeof raw === 'number') return Math.abs(raw)
  return Number(String(raw).replace(/[,\s원+\-]/g, '')) || 0
}


const DATE_KEYWORDS = ['날짜', '일시', '거래일', '거래일자', '처리일', '거래시간']
const DESC_KEYWORDS = ['내용', '거래내용', '적요', '기재내용', '메모', '거래처', '거래명', '내역']
const WITHDRAW_KEYWORDS = ['출금', '지출', '인출', '출금액', '출금금액', '찾으신']
const DEPOSIT_KEYWORDS = ['입금', '수입', '입금액', '입금금액', '맡기신']
const TYPE_KEYWORDS = ['구분', '거래구분', '입출금구분', '입출구분', '적요구분']
const AMOUNT_KEYWORDS = ['금액', '거래금액']

function isHeaderRow(cols: (string | number | undefined)[]): boolean {
  const strs = cols.map(c => String(c ?? ''))
  const hasDate = DATE_KEYWORDS.some(k => strs.some(s => s.includes(k)))
  const hasWithdrawDeposit =
    WITHDRAW_KEYWORDS.some(k => strs.some(s => s.includes(k))) ||
    DEPOSIT_KEYWORDS.some(k => strs.some(s => s.includes(k)))
  const hasTypeAmount =
    TYPE_KEYWORDS.some(k => strs.some(s => s.includes(k))) &&
    AMOUNT_KEYWORDS.some(k => strs.some(s => s.includes(k)))
  return hasDate && (hasWithdrawDeposit || hasTypeAmount)
}

function findHeaderRowIndex(rows: (string | number | undefined)[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (isHeaderRow(rows[i])) return i
  }
  return -1
}

function detectColumns(headers: string[]): {
  dateIdx: number
  descIdx: number
  withdrawIdx: number
  depositIdx: number
  typeIdx: number
  amountIdx: number
} {
  const find = (...keywords: string[]) =>
    headers.findIndex(h => keywords.some(k => String(h).includes(k)))
  return {
    dateIdx: find(...DATE_KEYWORDS),
    descIdx: find(...DESC_KEYWORDS),
    withdrawIdx: find(...WITHDRAW_KEYWORDS),
    depositIdx: find(...DEPOSIT_KEYWORDS),
    typeIdx: find(...TYPE_KEYWORDS),
    amountIdx: find(...AMOUNT_KEYWORDS),
  }
}

export interface ParseResult {
  transactions: TransactionInsert[]
  skipped: number
}

function parseRows(rows: (string | number | undefined)[][]): ParseResult {
  const headerIdx = findHeaderRowIndex(rows)
  if (headerIdx === -1) throw new Error('헤더 행을 찾을 수 없습니다. 거래내역 파일인지 확인해주세요.')

  const headers = rows[headerIdx].map(h => String(h ?? '').trim())
  const { dateIdx, descIdx, withdrawIdx, depositIdx, typeIdx, amountIdx } = detectColumns(headers)

  if (dateIdx === -1) throw new Error('날짜 열을 찾을 수 없습니다.')

  const hasSeparateCols = withdrawIdx !== -1 || depositIdx !== -1
  const hasTypedAmount = typeIdx !== -1 && amountIdx !== -1

  if (!hasSeparateCols && !hasTypedAmount) {
    throw new Error('금액 열을 찾을 수 없습니다.')
  }

  const transactions: TransactionInsert[] = []
  let skipped = 0

  for (const cols of rows.slice(headerIdx + 1)) {
    const rawDate = cols[dateIdx]
    if (!rawDate) { skipped++; continue }

    let withdraw = 0
    let deposit = 0

    if (hasSeparateCols) {
      withdraw = parseAmount(withdrawIdx !== -1 ? cols[withdrawIdx] : undefined)
      deposit = parseAmount(depositIdx !== -1 ? cols[depositIdx] : undefined)
    } else {
      const typeStr = String(cols[typeIdx] ?? '').trim()
      const amount = parseAmount(cols[amountIdx])
      if (typeStr.includes('입금') || typeStr === '입') deposit = amount
      else if (typeStr.includes('출금') || typeStr === '출') withdraw = amount
    }

    if (withdraw === 0 && deposit === 0) { skipped++; continue }

    try {
      const date = parseDate(rawDate)
      const description = descIdx !== -1 ? String(cols[descIdx] ?? '') : ''
      const type = deposit > 0 ? 'income' : 'expense'
      const amount = deposit > 0 ? deposit : withdraw
      const category = getRuleBasedCategory(description, type) ?? '기타'

      transactions.push({ type, amount, category, description: description || undefined, date })
    } catch {
      skipped++
    }
  }

  return { transactions, skipped }
}

function tryParse(buffer: ArrayBuffer, codepage?: number): ParseResult {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    ...(codepage ? { codepage } : {})
  })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, { header: 1 })
  return parseRows(rows as (string | number | undefined)[][])
}

export function parseTossFile(buffer: ArrayBuffer, fileName: string): ParseResult {
  const isCSV = fileName.toLowerCase().endsWith('.csv')

  if (isCSV) {
    // UTF-8 먼저 시도, 실패하면 EUC-KR(코드페이지 949)로 재시도
    try {
      const result = tryParse(buffer)
      if (result.transactions.length > 0) return result
    } catch {}
    return tryParse(buffer, 949)
  }

  return tryParse(buffer)
}
