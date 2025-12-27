// INDEX: components/dashboard/ErrorState.tsx
'use client'

import { useRouter } from 'next/navigation'
import { uiTokens } from '@/lib/ui-tokens'

type Props = {
  title: string
  message?: string | null
}

export function ErrorState({ title, message }: Props) {
  const router = useRouter()
  return (
    <div className={`${uiTokens.card} ${uiTokens.radius} ${uiTokens.padding} ${uiTokens.gap}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          {message ? (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700">Details</summary>
              <p className="mt-1 whitespace-pre-line">{message}</p>
            </details>
          ) : null}
          <button
            onClick={() => router.refresh()}
            className="inline-flex w-auto items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          >
            Neu laden
          </button>
        </div>
      </div>
    </div>
  )
}
