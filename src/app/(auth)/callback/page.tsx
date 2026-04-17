import { redirect } from 'next/navigation'

type CallbackPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LegacyCallbackPage({ searchParams }: CallbackPageProps) {
  const resolved = (await searchParams) ?? {}
  const forwardParams = new URLSearchParams()

  const code = getFirst(resolved.code)
  if (code) {
    forwardParams.set('code', code)
  }

  const next = getFirst(resolved.next) || getFirst(resolved.redirect) || '/home'
  forwardParams.set('next', next)

  const state = getFirst(resolved.state)
  if (state) {
    forwardParams.set('state', state)
  }

  const error = getFirst(resolved.error)
  if (error) {
    forwardParams.set('error', error)
  }

  const errorDescription = getFirst(resolved.error_description)
  if (errorDescription) {
    forwardParams.set('error_description', errorDescription)
  }

  const redirectUrl = `/auth/callback?${forwardParams.toString()}`
  redirect(redirectUrl)
}
