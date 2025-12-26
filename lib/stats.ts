// INDEX: lib/stats.ts

export type Tx = {
  type: string
  pot?: string | null
  amount_cents: number
  occurred_on: string
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

export function endOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 0)
}

export function monthKey(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

type MonthStats = {
  spend_alloc_cents: number
  save_alloc_cents: number
  invest_alloc_cents: number
  interest_cents: number
  income_cents: number
  transfer_out_cents: number
}

export function computeMonthStats(transactions: Tx[], fromDate: Date, toDate: Date): MonthStats {
  const fromMs = fromDate.getTime()
  const toMs = toDate.getTime()

  const acc: MonthStats = {
    spend_alloc_cents: 0,
    save_alloc_cents: 0,
    invest_alloc_cents: 0,
    interest_cents: 0,
    income_cents: 0,
    transfer_out_cents: 0,
  }

  for (const tx of transactions) {
    const ms = new Date(tx.occurred_on).getTime()
    if (Number.isNaN(ms) || ms < fromMs || ms > toMs) continue

    if (tx.type === 'allocation') {
      if (tx.pot === 'spend') acc.spend_alloc_cents += tx.amount_cents
      if (tx.pot === 'save') acc.save_alloc_cents += tx.amount_cents
      if (tx.pot === 'invest') acc.invest_alloc_cents += tx.amount_cents
    }

    if (tx.type === 'interest') {
      acc.interest_cents += tx.amount_cents
    }

    if (tx.type === 'weekly_allowance' || tx.type === 'extra_payment') {
      acc.income_cents += tx.amount_cents
    }

    if (tx.type === 'invest_transfer') {
      acc.transfer_out_cents += tx.amount_cents
    }
  }

  return acc
}

export function computeSixMonthTrend(transactions: Tx[], monthsBack = 6) {
  const today = new Date()
  const buckets: Record<string, number> = {}
  const keys: string[] = []

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = monthKey(d)
    buckets[key] = 0
    keys.push(key)
  }

  for (const tx of transactions) {
    if (tx.type !== 'allocation' || tx.pot !== 'save') continue
    const key = monthKey(new Date(tx.occurred_on))
    if (key in buckets) {
      buckets[key] += tx.amount_cents
    }
  }

  return keys.map((k) => ({ key: k, save_alloc_cents: buckets[k] || 0 }))
}
