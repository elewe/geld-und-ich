// INDEX: lib/dashboard-data.ts
import { createServerSupabaseReadClient } from '@/supabase/server'
import { monthKey, startOfMonth } from '@/lib/stats'
import { PotVariant } from '@/lib/ui-tokens'

type TransactionRow = {
  pot: PotVariant | string | null
  amount_cents: number | null
  occurred_on: string | null
  type?: string | null
  meta?: Record<string, any> | null
}

export type ChildRow = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  created_at: string | null
  avatar_mode?: 'emoji' | 'image' | null
  avatar_emoji?: string | null
  avatar_image_url?: string | null
  accent_color?: string | null
}

export type PotTotals = { spend: number; save: number; invest: number }

export type MonthlyPotSummary = PotTotals & { total: number }

export type MonthlyBarRow = {
  key: string
  label: string
  spend: number
  save: number
  invest: number
  total: number
}

export async function getChildrenForUser(userId: string) {
  const supabase = await createServerSupabaseReadClient()
  const { data, error } = await supabase
    .from('children')
    .select('id, name, age, weekly_amount, created_at, avatar_mode, avatar_emoji, avatar_image_url, accent_color')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [] as ChildRow[], error: error.message }
  }

  return { data: (data ?? []) as ChildRow[], error: null }
}

export async function getPotBalances(childId: string, userId: string) {
  const supabase = await createServerSupabaseReadClient()
  const { data, error } = await supabase
    .from('balances')
    .select('spend_cents, save_cents, invest_cents')
    .eq('child_id', childId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { data: null as PotTotals | null, error: error.message }
  }

  const payload = data ?? { spend_cents: 0, save_cents: 0, invest_cents: 0 }
  return {
    data: {
      spend: payload.spend_cents ?? 0,
      save: payload.save_cents ?? 0,
      invest: payload.invest_cents ?? 0,
    },
    error: null,
  }
}

export async function getMonthlyPotSums(childId: string, monthStart: Date, monthEnd: Date) {
  const from = toISODate(monthStart)
  const to = toISODate(monthEnd)
  const { data, error } = await fetchPotTransactions(childId, { from, to })
  if (error) return { data: null as MonthlyPotSummary | null, error }
  const totals = accumulateByPot(data, { signed: true, clampZero: true })
  const total = totals.spend + totals.save + totals.invest
  return { data: { ...totals, total }, error: null }
}

export async function getLastNMonthsPotSums(childId: string, n = 6) {
  const months = Math.max(1, n)
  const today = new Date()
  const rangeStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1))
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const { data, error } = await fetchPotTransactions(childId, {
    from: toISODate(rangeStart),
    to: toISODate(rangeEnd),
  })
  if (error) return { data: [] as MonthlyBarRow[], error }

  const buckets: Record<string, MonthlyBarRow> = {}
  const labels: string[] = []

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = monthKey(d)
    labels.push(key)
    buckets[key] = {
      key,
      label: formatMonthLabel(d),
      spend: 0,
      save: 0,
      invest: 0,
      total: 0,
    }
  }

  for (const tx of data) {
    const key = monthKey(new Date(tx.occurred_on ?? ''))
    if (!buckets[key]) continue
    const amount = computeSignedAmount(tx)
    const safeAmount = Math.max(0, amount)
    const pot = normalizePot(tx.pot)
    if (!pot) continue
    buckets[key][pot] += safeAmount
    buckets[key].total += safeAmount
  }

  const rows = labels.map((k) => buckets[k]).filter(Boolean)
  return { data: rows, error: null as string | null }
}

async function fetchPotTransactions(
  childId: string,
  range?: { from?: string; to?: string }
): Promise<{ data: TransactionRow[]; error: string | null }> {
  const supabase = await createServerSupabaseReadClient()
  let query = supabase
    .from('transactions')
    .select('pot, amount_cents, occurred_on, type, meta')
    .eq('child_id', childId)
    .in('pot', ['spend', 'save', 'invest', 'donate'])
    .order('occurred_on', { ascending: true })

  if (range?.from) query = query.gte('occurred_on', range.from)
  if (range?.to) query = query.lte('occurred_on', range.to)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as TransactionRow[], error: null }
}

function accumulateByPot(
  rows: TransactionRow[],
  { signed, clampZero }: { signed: boolean; clampZero?: boolean }
) {
  const totals: PotTotals = { spend: 0, save: 0, invest: 0 }
  for (const tx of rows) {
    const pot = normalizePot(tx.pot)
    if (!pot) continue
    const amount = signed ? computeSignedAmount(tx) : tx.amount_cents ?? 0
    const value = clampZero ? Math.max(0, amount) : amount
    totals[pot] += value
  }
  return totals
}

function computeSignedAmount(tx: TransactionRow) {
  const amount = Math.abs(tx.amount_cents ?? 0)
  const type = (tx.type || '').toString()
  if (type === 'invest_transfer' || type === 'spend' || type === 'payout') return -amount
  if (type === 'weekly_allowance' || type === 'extra_payment') return 0
  return amount
}

function normalizePot(pot: TransactionRow['pot']): PotVariant | null {
  if (pot === 'spend' || pot === 'save' || pot === 'invest') return pot
  if (pot === 'donate') return null
  return null
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('de-CH', { month: 'short' }).format(date)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
