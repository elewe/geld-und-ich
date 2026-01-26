// INDEX: components/payout/PayoutWizard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { Drawer } from '@/components/ui/Drawer'
import { StepDots } from '@/components/ui/StepDots'
import { Button } from '@/components/ui/Button'
import { CentsInput } from '@/components/money/CentsInput'
import { AllocationCounter } from '@/components/money/AllocationCounter'
import { getPotMeta } from '@/components/money/pots'
import { formatCHF } from '@/components/money/format'

type Child = {
  id: string
  name: string | null
  weekly_amount: number | null
}

type Props = {
  open: boolean
  onClose: () => void
  child: Child | null
  onSuccess?: () => void
}

const STEP_TOTAL = 3
const STEP_ALLOCATION = 2

export function PayoutWizard({ open, onClose, child, onSuccess }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [step, setStep] = useState(1)
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [totalCents, setTotalCents] = useState(0)
  const [spendCents, setSpendCents] = useState(0)
  const [saveCents, setSaveCents] = useState(0)
  const [investCents, setInvestCents] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && child) {
      const defaultTotal = Math.max(0, Math.round((child.weekly_amount ?? 0) * 100))
      const half = Math.floor(defaultTotal / 2)
      const remainder = defaultTotal - half
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTotalCents(defaultTotal)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveCents(half)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvestCents(remainder)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpendCents(0)
      setDate(new Date().toISOString().slice(0, 10))
      setStep(1)
      setError(null)
      setSuccess(false)
    }
  }, [open, child])

  function ensureAllocations(total: number, nextSave: number, nextInvest: number) {
    const cappedSave = Math.max(0, Math.min(total, nextSave))
    const cappedInvest = Math.max(0, Math.min(total, nextInvest))
    const sum = cappedSave + cappedInvest
    if (sum > total) {
      const scale = total / sum
      const adjSave = Math.floor(cappedSave * scale)
      const adjInvest = total - adjSave
      setSaveCents(adjSave)
      setInvestCents(adjInvest)
      setSpendCents(0)
    } else {
      setSaveCents(cappedSave)
      setInvestCents(cappedInvest)
      setSpendCents(total - (cappedSave + cappedInvest))
    }
  }

  function setQuickAllSave() {
    ensureAllocations(totalCents, totalCents, 0)
  }

  function setQuickHalf() {
    const half = Math.floor(totalCents / 2)
    ensureAllocations(totalCents, half, totalCents - half)
  }

  function nextStep() {
    if (step === 1) {
      if (totalCents <= 0) {
        setError('Betrag muss größer 0 sein.')
        return
      }
      setError(null)
      setStep(2)
      return
    }

    if (step === 2) {
      const sum = spendCents + saveCents + investCents
      if (sum !== totalCents) {
        setError('Aufteilung muss genau dem Gesamtbetrag entsprechen.')
        return
      }
      if (saveCents + investCents <= 0) {
        setError('Mindestens Sparen oder Investieren muss > 0 sein.')
        return
      }
      setError(null)
      setStep(3)
      return
    }
  }

  async function handleConfirm() {
    if (!child) return
    const sum = spendCents + saveCents + investCents
    if (sum !== totalCents || totalCents <= 0 || saveCents + investCents <= 0) {
      setError('Aufteilung prüfen.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError(userError.message)
      setSaving(false)
      return
    }
    const user = userData.user
    if (!user) {
      setError('Nicht eingeloggt.')
      setSaving(false)
      return
    }

    const { data: currentBalance } = await supabase
      .from('balances')
      .select('spend_cents, save_cents, invest_cents')
      .eq('child_id', child.id)
      .single()

    const baseTx = {
      child_id: child.id,
      user_id: user.id,
      type: 'weekly_allowance',
      pot: 'spend',
      amount_cents: totalCents,
      occurred_on: date,
      meta: { source: 'payout_wizard' },
    }

    const allocations = [
      spendCents > 0
        ? {
            child_id: child.id,
            user_id: user.id,
            type: 'allocation',
            pot: 'spend',
            amount_cents: spendCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
      saveCents > 0
        ? {
            child_id: child.id,
            user_id: user.id,
            type: 'allocation',
            pot: 'save',
            amount_cents: saveCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
      investCents > 0
        ? {
            child_id: child.id,
            user_id: user.id,
            type: 'allocation',
            pot: 'invest',
            amount_cents: investCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
    ].filter(Boolean) as {
      child_id: string
      user_id: string
      type: string
      pot: 'spend' | 'save' | 'invest'
      amount_cents: number
      occurred_on: string
      meta: { source: string }
    }[]

    const txPayload = [baseTx, ...allocations]
    const { error: txError } = await supabase.from('transactions').insert(txPayload)
    if (txError) {
      setError(txError.message)
      setSaving(false)
      return
    }

    const nextBalance = {
      spend_cents: (currentBalance?.spend_cents ?? 0) + spendCents,
      save_cents: (currentBalance?.save_cents ?? 0) + saveCents,
      invest_cents: (currentBalance?.invest_cents ?? 0) + investCents,
    }

    const { error: balanceError } = await supabase
      .from('balances')
      .upsert(
        {
          child_id: child.id,
          user_id: user.id,
          ...nextBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id' }
      )

    if (balanceError) {
      setError(balanceError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setSuccess(true)
    onSuccess?.()
  }

  const spendMeta = getPotMeta('spend')
  const saveMeta = getPotMeta('save')
  const investMeta = getPotMeta('invest')

  return (
    <Drawer open={open} onClose={onClose} title="Auszahlung hinzufügen">
      <div className="space-y-4">
        {!success && <StepDots current={step} total={STEP_TOTAL} />}

        {success && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="absolute inset-0 pointer-events-none animate-pulse bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.12),transparent_25%)]" />
            <div className="relative space-y-2">
              <p className="text-3xl">🐷</p>
              <p className="text-lg font-semibold text-slate-900">Dein Sparschatz ist gewachsen.</p>
              <p className="text-sm text-slate-700">🚀 Deine Rakete ist ein Stück näher am Start.</p>
              <Button onClick={onClose}>Fertig</Button>
            </div>
          </div>
        )}

        {!success && step === 1 && (
          <div className="space-y-3">
            <CentsInput label="Betrag" valueCents={totalCents} onChangeCents={(v) => {
              setTotalCents(v)
              ensureAllocations(v, saveCents, investCents)
            }} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Datum</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <Button onClick={nextStep}>Weiter</Button>
          </div>
        )}

        {!success && step === STEP_ALLOCATION && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth={false} onClick={setQuickAllSave}>
                Alles sparen
              </Button>
              <Button variant="secondary" fullWidth={false} onClick={setQuickHalf}>
                Halbe/Halbe
              </Button>
            </div>

            <AllocationCounter
              label="Ausgeben"
              emoji={spendMeta.emoji}
              cents={spendCents}
              accentClasses={spendMeta.accentClasses}
              onDec={() => ensureAllocations(totalCents, saveCents, investCents + Math.min(50, investCents))}
              onInc={() => ensureAllocations(totalCents, saveCents, investCents)}
            />
            <AllocationCounter
              label="Sparen"
              emoji={saveMeta.emoji}
              cents={saveCents}
              accentClasses={saveMeta.accentClasses}
              onDec={() => ensureAllocations(totalCents, Math.max(0, saveCents - 50), investCents)}
              onInc={() => ensureAllocations(totalCents, saveCents + 50, investCents)}
            />
            <AllocationCounter
              label="Investieren"
              emoji={investMeta.emoji}
              cents={investCents}
              accentClasses={investMeta.accentClasses}
              onDec={() => ensureAllocations(totalCents, saveCents, Math.max(0, investCents - 50))}
              onInc={() => ensureAllocations(totalCents, saveCents, investCents + 50)}
            />
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Summe</span>
              <span className="font-semibold">{formatCHF(spendCents + saveCents + investCents)}</span>
            </div>
            <Button onClick={nextStep}>Weiter</Button>
          </div>
        )}

        {!success && step === 3 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-sm text-slate-600">Datum: {date}</p>
              <p className="text-sm text-slate-600">Gesamt: {formatCHF(totalCents)}</p>
              <p className="text-sm text-slate-600">🧸 Ausgeben: {formatCHF(spendCents)}</p>
              <p className="text-sm text-slate-600">🐷 Sparen: {formatCHF(saveCents)}</p>
              <p className="text-sm text-slate-600">🚀 Investieren: {formatCHF(investCents)}</p>
            </div>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? 'Speichere…' : 'Speichern'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        )}

        {error && !success ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
      </div>
    </Drawer>
  )
}
