// src/components/auth/RoleBasedAccess.tsx
import React from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import type { UserRole } from '@/contexts/auth/types';

interface RoleBasedAccessProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const { profile } = useAuth();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Custom hook for checking permissions
export const usePermissions = () => {
  const { profile } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return profile ? roles.includes(profile.role) : false;
  };

  const canManageFleet = hasAnyRole(['admin', 'fleet_manager']);
  const canApproveBookings = hasAnyRole(['admin', 'fleet_manager']);
  const canViewAllBookings = hasAnyRole(['admin', 'fleet_manager']);
  const canManageUsers = hasRole('admin'); // Only admins can modify users
  const canViewUsers = hasAnyRole(['admin', 'fleet_manager']); // Fleet managers can view users
  const canCreateBookings = hasAnyRole(['admin', 'fleet_manager', 'driver']);
  const canViewDamageReports = hasAnyRole(['admin', 'fleet_manager']);

  return {
    hasRole,
    hasAnyRole,
    canManageFleet,
    canApproveBookings,
    canViewAllBookings,
    canManageUsers,
    canViewUsers, // Added this new permission
    canCreateBookings,
    canViewDamageReports,
    isAdmin: hasRole('admin'),
    isFleetManager: hasRole('fleet_manager'),
    isDriver: hasRole('driver'),
    isViewer: hasRole('viewer'),
  };
};

export default RoleBasedAccess;