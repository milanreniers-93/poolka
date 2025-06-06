// src/pages/Index.tsx - Smart router for auth/unauth users
import React, { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { usePermissions } from '@/components/auth/RoleBasedAccess';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { canManageFleet } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  // Add debugging
  useEffect(() => {
    console.log('Index page - Auth state:', { 
      user: !!user, 
      profile: !!profile, 
      loading,
      role: profile?.role,
      pathname: location.pathname 
    });
  }, [user, profile, loading, location.pathname]);

  // Show loading while auth is being determined
  if (loading) {
    console.log('Index: Showing loading spinner');
    return <LoadingSpinner message="Loading..." fullScreen />;
  }

  // If not authenticated, show landing page
  if (!user || !profile) {
    console.log('Index: Showing landing page for unauthenticated user');
    return <LandingPage />;
  }

  // AUTHENTICATED USER - Role-based redirects
  console.log('Index: Redirecting authenticated user based on role:', profile.role);

  // Drivers go to bookings (their main use case)
  if (profile.role === 'driver') {
    console.log('Index: Redirecting driver to bookings');
    return <Navigate to="/bookings" replace />;
  }
  
  // Fleet managers and admins go to fleet manager dashboard
  if (canManageFleet) {
    console.log('Index: Redirecting fleet manager/admin to fleet-manager');
    return <Navigate to="/fleet-manager" replace />;
  }

  // Fallback - redirect to bookings if role is unclear
  console.log('Index: Fallback redirect to bookings');
  return <Navigate to="/bookings" replace />;
};

export default Index;