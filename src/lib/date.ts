/**
 * Datas (RN23). `date` puro, sem hora e sem fuso.
 * "Hoje" é sempre o hoje de São Paulo, tanto no servidor quanto no client,
 * para o lançamento não pular de dia entre 21h e a meia-noite.
 */

const TZ = 'America/Sao_Paulo'

const isoParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "YYYY-MM-DD" de hoje no fuso do produto. */
export function todayISO(): string {
  return isoParts.format(new Date())
}

/** "YYYY-MM" do mês corrente. */
export function currentYm(): string {
  return todayISO().slice(0, 7)
}

export function isValidYm(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)
}

export function isValidISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const [y, m, day] = d.split('-').map(Number)
  if (m < 1 || m > 12) return false
  return day >= 1 && day <= daysInMonth(y, m)
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

/** "2026-03" -> "2026-03-01" */
export function ymToFirstDay(ym: string): string {
  return `${ym}-01`
}

/** "2026-03" -> "2026-03-31" */
export function ymToLastDay(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(daysInMonth(y, m)).padStart(2, '0')}`
}

export function ymOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function addMonthsToYm(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

/** Soma meses a uma data ISO, com clamp de dia (31/01 + 1 mês = 28 ou 29/02). */
export function addMonthsToDate(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const nd = Math.min(d, daysInMonth(ny, nm))
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

export function addDaysToDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/** "2026-03" -> "março de 2026" */
export function formatYmLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES[m - 1]} de ${y}`
}

/** "2026-03" -> "mar/26" */
export function formatYmShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES_CURTOS[m - 1]}/${String(y).slice(2)}`
}

/** "2026-03-05" -> "05/03" */
export function formatDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${d}/${m}`
}

/** "2026-03-05" -> "05/03/2026" */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

/** Limites de sanidade da entrada (RN25). */
export const MIN_DATE = '2000-01-01'
export function maxDate(): string {
  const [y, m, d] = todayISO().split('-').map(Number)
  return `${y + 10}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
