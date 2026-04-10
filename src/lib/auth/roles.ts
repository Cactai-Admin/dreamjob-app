import type { UserRole } from '@/types/database'

/**
 * Numeric hierarchy levels for each role.
 * Higher numbers indicate more privileged roles.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  user: 10,
  agent: 5,
  demo: 0,
}

/**
 * Check whether a user role meets the minimum required role level.
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if the role is super_admin.
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

/**
 * Check if the role is admin or higher.
 */
export function isAdmin(role: UserRole): boolean {
  return hasMinimumRole(role, 'admin')
}

/**
 * Check if the role is support or higher.
 */
export function isSupport(role: UserRole): boolean {
  return hasMinimumRole(role, 'support')
}

/**
 * Check if the role is an internal (staff) role: support, admin, or super_admin.
 */
export function isInternalRole(role: UserRole): boolean {
  return hasMinimumRole(role, 'support')
}

/**
 * Check whether an actor with the given role can manage (edit/delete) a target user.
 * An actor can only manage users whose role level is strictly lower than their own.
 */
export function canManageUser(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Get a human-readable display name for a role.
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    support: 'Support',
    user: 'User',
    agent: 'Agent',
    demo: 'Demo',
  }
  return names[role]
}

/**
 * Get a Tailwind CSS color class for a role badge.
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: 'text-red-700 bg-red-100',
    admin: 'text-purple-700 bg-purple-100',
    support: 'text-blue-700 bg-blue-100',
    user: 'text-green-700 bg-green-100',
    agent: 'text-amber-700 bg-amber-100',
    demo: 'text-gray-700 bg-gray-100',
  }
  return colors[role]
}
