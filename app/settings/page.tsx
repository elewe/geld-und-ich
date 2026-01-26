import Link from 'next/link'

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] px-6 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white/90 p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#5a4a6a]">Einstellungen</h1>
          <Link href="/" className="text-sm font-medium text-[#7b6b8f] underline">
            Zurück
          </Link>
        </div>
        <p className="mt-4 text-sm text-[#9b8bab]">
          Hier kommen bald persönliche Einstellungen und Benachrichtigungen.
        </p>
      </div>
    </main>
  )
}
