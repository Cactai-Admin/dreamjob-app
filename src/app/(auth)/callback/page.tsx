import { redirect } from 'next/navigation'

type CallbackPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LegacyCallbackPage({ searchParams }: CallbackPageProps) {
  const resolved = (await searchParams) ?? {}
  const next = getFirst(resolved.redirect) || getFirst(resolved.next) || '/home'

  const redirectUrl = `/auth/callback?next=${encodeURIComponent(next)}`
  redirect(redirectUrl)
}
