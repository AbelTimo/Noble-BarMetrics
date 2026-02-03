/**
 * Role-based permissions system for BarMetrics
 *
 * Roles:
 * - BARTENDER: scan+view only
 * - STOREKEEPER: batch generate, assign labels, change location
 * - MANAGER: full access including retire/reprint and SKU management
 */

export const ROLES = ['BARTENDER', 'STOREKEEPER', 'MANAGER'] as const;
export type Role = typeof ROLES[number];

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  // Label permissions
  LABEL_VIEW: 'label:view',
  LABEL_SCAN: 'label:scan',
  LABEL_GENERATE: 'label:generate',
  LABEL_ASSIGN: 'label:assign',
  LABEL_CHANGE_LOCATION: 'label:change_location',
  LABEL_RETIRE: 'label:retire',
  LABEL_REPRINT: 'label:reprint',

  // SKU permissions
  SKU_VIEW: 'sku:view',
  SKU_CREATE: 'sku:create',
  SKU_UPDATE: 'sku:update',
  SKU_DELETE: 'sku:delete',
  SKU_LINK_PRODUCTS: 'sku:link_products',

  // Location permissions
  LOCATION_VIEW: 'location:view',
  LOCATION_CREATE: 'location:create',

  // Audit permissions
  AUDIT_VIEW: 'audit:view',

  // User management permissions
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  BARTENDER: [
    PERMISSIONS.LABEL_VIEW,
    PERMISSIONS.LABEL_SCAN,
    PERMISSIONS.SKU_VIEW,
    PERMISSIONS.LOCATION_VIEW,
  ],

  STOREKEEPER: [
    // All bartender permissions
    PERMISSIONS.LABEL_VIEW,
    PERMISSIONS.LABEL_SCAN,
    PERMISSIONS.SKU_VIEW,
    PERMISSIONS.LOCATION_VIEW,
    // Additional storekeeper permissions
    PERMISSIONS.LABEL_GENERATE,
    PERMISSIONS.LABEL_ASSIGN,
    PERMISSIONS.LABEL_CHANGE_LOCATION,
    PERMISSIONS.LOCATION_CREATE,
    PERMISSIONS.AUDIT_VIEW,
  ],

  MANAGER: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    BARTENDER: 'Bartender',
    STOREKEEPER: 'Storekeeper',
    MANAGER: 'Manager',
  };
  return names[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    BARTENDER: 'Can scan and view labels only',
    STOREKEEPER: 'Can generate labels, assign to locations, and manage inventory',
    MANAGER: 'Full access to all features including user management',
  };
  return descriptions[role] || '';
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: Role): string {
  const colors: Record<Role, string> = {
    BARTENDER: 'bg-blue-100 text-blue-800',
    STOREKEEPER: 'bg-green-100 text-green-800',
    MANAGER: 'bg-purple-100 text-purple-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Permission check error
 */
export class PermissionError extends Error {
  constructor(
    public permission: Permission,
    public userRole: Role,
    message?: string
  ) {
    super(message || `Permission denied: ${permission} requires higher role than ${userRole}`);
    this.name = 'PermissionError';
  }
}

/**
 * Assert that a user has a permission, throw if not
 */
export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(permission, role);
  }
}
