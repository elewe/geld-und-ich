// INDEX: app/dashboard/[childId]/page.tsx
import { redirect } from 'next/navigation'

type PageProps = {
  params: { childId: string }
}

export default function DashboardChildRedirect({ params }: PageProps) {
  const childId = params.childId
  const suffix = childId ? `/?child=${childId}` : '/'
  redirect(suffix)
}
