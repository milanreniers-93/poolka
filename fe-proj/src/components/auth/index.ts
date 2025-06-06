// src/components/auth/index.ts

// Components
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as RoleBasedAccess, usePermissions } from './RoleBasedAccess'; 
export { default as SignInForm } from './SignInForm';
export { default as SignUpForm } from './SignUpForm';

// Types (if you want to export them)
export type UserRole = 'admin' | 'fleet_manager' | 'driver' | 'viewer';

// Permission constants
export const ROLES = {
  ADMIN: 'admin' as const,
  FLEET_MANAGER: 'fleet_manager' as const,
  DRIVER: 'driver' as const,
  VIEWER: 'viewer' as const,
};

export const ROLE_PERMISSIONS = {
  MANAGE_FLEET: ['admin', 'fleet_manager'],
  CREATE_BOOKINGS: ['admin', 'fleet_manager', 'driver'],
  VIEW_REPORTS: ['admin', 'fleet_manager'],
  MANAGE_USERS: ['admin'],
  APPROVE_BOOKINGS: ['admin', 'fleet_manager'],
  VIEW_ALL_BOOKINGS: ['admin', 'fleet_manager'],
} as const;