// INDEX: app/loading.tsx
export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 md:max-w-3xl lg:max-w-4xl">
        <div className="h-14 rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur" />
        <div className="space-y-3">
          <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
        <div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    </main>
  )
}
