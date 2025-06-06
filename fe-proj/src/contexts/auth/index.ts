// src/contexts/auth/index.ts - Updated exports
export {
  AuthProvider,
  useAuth,
} from './AuthContext';

export type {
  Profile,
  Organization,
  SignUpUserData,
  SignUpOrganizationData,
  SignUpResult,
  AuthContextType,
  UserRole,
  CompanySize,
  ProfileUpdate,
  OrganizationUpdate,
  ValidationErrors,
  FormState,
  ApiResponse,
  User,
  Session
} from './types';

// Auth-related constants
export const AUTH_STORAGE_KEY = 'auth_user';
export const ORGANIZATION_STORAGE_KEY = 'user_organization';

// Role constants for easy reference (using database enum values)
export const USER_ROLES = {
  ADMIN: 'admin',
  FLEET_MANAGER: 'fleet_manager',
  DRIVER: 'driver',
  VIEWER: 'viewer'
} as const;