// INDEX: components/dashboard/DashboardScreen.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { ChildRow, PotTotals } from '@/lib/dashboard-data'
import { formatCHF } from '@/lib/ui'

type Props = {
  childrenList: Array<{
    child: ChildRow
    balances: PotTotals
  }>
}

export function DashboardScreen({ childrenList }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const potTiles = [
    {
      key: 'spend',
      label: 'Ausgeben',
      emoji: '💰',
      gradient: 'from-[#ffe5dd] to-[#ffd4c8]',
      text: 'text-[#a0472a]',
      subtext: 'text-[#c65d3b]',
    },
    {
      key: 'save',
      label: 'Sparen',
      emoji: '🏦',
      gradient: 'from-[#d4e9f7] to-[#c4e0f0]',
      text: 'text-[#2a5580]',
      subtext: 'text-[#3b6d9b]',
    },
    {
      key: 'invest',
      label: 'Investieren',
      emoji: '🌱',
      gradient: 'from-[#d8f3d8] to-[#c8ebc8]',
      text: 'text-[#3a7a3a]',
      subtext: 'text-[#4a8f4a]',
    },
    {
      key: 'donate',
      label: 'Spenden',
      emoji: '💝',
      gradient: 'from-[#ffe5f0] to-[#f5e5ff]',
      text: 'text-[#7a5a8a]',
      subtext: 'text-[#9b6bab]',
    },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] text-[#0a0a0a]">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] w-full max-w-5xl items-center justify-between px-6 py-0">
          <div className="flex items-center gap-[7.991px] text-[#5a4a6a]">
            <span className="text-[24px] leading-[32px]">💰</span>
            <span className="text-[20px] font-semibold leading-[28px] tracking-[-0.4492px]">
              Geld & ich
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Profil"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <UserIcon className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-6 top-full mt-2 w-44 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-[0px_12px_25px_-8px_rgba(0,0,0,0.18)]"
            >
              <Link
                role="menuitem"
                href="/settings"
                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#5a4a6a] hover:bg-[#f5f0ff]"
                onClick={() => setMenuOpen(false)}
              >
                Einstellungen
              </Link>
              <button
                type="button"
                role="menuitem"
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#7b6b8f] hover:bg-[#f5f0ff]"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.replace('/login')
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          {childrenList.map(({ child, balances }) => {
          const total = balances.spend + balances.save + balances.invest + balances.donate
          const weekly = formatCHF(Math.round((child.weekly_amount ?? 0) * 100))
          const avatarEmoji =
            child.avatar_mode === 'emoji' ? child.avatar_emoji ?? '🧒' : '🧒'
          const showDonate =
            (child.age ?? 0) >= 7 || Boolean(child.donate_enabled) || (balances.donate ?? 0) > 0
          const tiles = showDonate
            ? potTiles
            : potTiles.filter((tile) => tile.key !== 'donate')

          return (
            <section
              key={child.id}
              className="w-full rounded-[24px] bg-white/90 p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {child.avatar_mode === 'image' && child.avatar_image_url ? (
                    <Image
                      src={child.avatar_image_url}
                      alt={child.name ? `${child.name} Avatar` : 'Kind Avatar'}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[36px] leading-[40px] tracking-[0.3691px]">
                      {avatarEmoji}
                    </span>
                  )}
                  <div>
                    <p className="text-[20px] font-semibold leading-[28px] tracking-[-0.4492px] text-[#5a4a6a]">
                      {child.name ?? 'Kind'}
                    </p>
                    <p className="text-[14px] leading-[20px] tracking-[-0.1504px] text-[#9b8bab]">
                      Total: {formatCHF(total)} · {child.age ?? '—'} Jahre
                    </p>
                  </div>
                </div>
                <Link
                  href={`/children/${child.id}`}
                  className="text-[14px] font-medium leading-[20px] tracking-[-0.1504px] text-[#7b6b8f] underline"
                >
                  Ansehen
                </Link>
              </div>

                <div
                className={`mt-6 grid gap-3 ${
                  showDonate ? 'grid-cols-2' : 'grid-cols-3'
                }`}
              >
                {tiles.map((tile) => {
                  const amount =
                    tile.key === 'spend'
                      ? balances.spend
                      : tile.key === 'save'
                        ? balances.save
                        : tile.key === 'invest'
                          ? balances.invest
                          : balances.donate

                  return (
                    <div
                      key={tile.key}
                      className={`flex h-[115.963px] flex-col items-center gap-[3.996px] rounded-[16px] bg-gradient-to-b ${tile.gradient} px-4 pb-0 pt-4`}
                    >
                      <span className="text-[24px] leading-[32px] tracking-[0.0703px]">
                        {tile.emoji}
                      </span>
                      <span
                        className={`text-[12px] font-medium leading-[16px] ${tile.subtext}`}
                      >
                        {tile.label}
                      </span>
                      <span
                        className={`text-[18px] font-bold leading-[28px] tracking-[-0.4395px] ${tile.text}`}
                      >
                        {formatPotValue(amount)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 rounded-[16px] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] px-3 py-3 text-center text-[12px] leading-[16px] text-[#9b8bab]">
                Wöchentlich:{' '}
                <span className="font-bold text-[#5a4a6a]">{weekly}</span>
              </div>

              <Link
                href={`/children/${child.id}/payout`}
                className="mt-4 flex min-h-[56px] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8] px-4 text-[16px] font-semibold leading-[24px] tracking-[-0.3125px] text-[#2a5a5a] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
              >
                <PlusIcon className="size-5" />
                Geld hinzufügen
              </Link>
            </section>
          )
        })}
        </div>

        <Link
          href="/children/create"
          className="mt-6 flex min-h-[80px] items-center justify-center gap-3 rounded-[24px] border border-[#d0c0e0] border-[1.76px] bg-white/90 px-3 py-2 text-[18px] font-semibold leading-[28px] tracking-[-0.4395px] text-[#7b6b8f] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] md:col-span-2"
        >
          <PlusIcon className="size-6" />
          Kind hinzufügen
        </Link>
      </main>
    </div>
  )
}

function formatPotValue(cents: number | null | undefined) {
  const safe = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0
  return (safe / 100).toFixed(2)
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.2 16.2c1.6-2.4 3.7-3.6 5.8-3.6s4.2 1.2 5.8 3.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
