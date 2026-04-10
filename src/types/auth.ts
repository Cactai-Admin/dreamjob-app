import type { Account, AccountRole, UserRole } from '@/types/database'

export interface SessionUser {
  account: Account
  roles: AccountRole[]
  activeRole: UserRole
}

export interface LoginCredentials {
  identifier: string
  password: string
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'
