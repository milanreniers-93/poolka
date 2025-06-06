// src/components/auth/ProtectedRoute.tsx - Enhanced to handle redirects safely
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/auth';
import LoadingSpinner from '../common/LoadingSpinner';
import type { UserRole } from '../../contexts/auth/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole; // Now supports all 4 roles from database
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute check:', { user: !!user, profile: !!profile, loading, pathname: location.pathname });

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (!user || !profile) {
    console.log('ProtectedRoute: Redirecting to sign-in');
    // Redirect to sign-in but save the attempted location
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const roleHierarchy: Record<UserRole, number> = {
      'viewer': 1,
      'driver': 2,
      'fleet_manager': 3,
      'admin': 4
    };

    const userLevel = roleHierarchy[profile.role];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      console.log('ProtectedRoute: Insufficient role, redirecting to unauthorized');
      return <Navigate to="/bookings" replace />; // Redirect to bookings instead of /unauthorized for now
    }
  }

  console.log('ProtectedRoute: Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;