// INDEX: app/dashboard/page.tsx
import { redirect } from 'next/navigation'

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function DashboardRedirect({ searchParams }: PageProps) {
  const params = new URLSearchParams()
  if (searchParams?.child) {
    const value = Array.isArray(searchParams.child) ? searchParams.child[0] : searchParams.child
    if (value) params.set('child', value)
  }
  const suffix = params.toString()
  redirect(suffix ? `/?${suffix}` : '/')
}
