// src/pages/SignInPage.tsx - Fixed with safe redirect
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SignInForm from '../components/auth/SignInForm';

const SignInPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users away from sign-in page
  useEffect(() => {
    if (!loading && user && profile) {
      const from = location.state?.from?.pathname || '/';
      console.log('SignInPage: User already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, profile, loading, navigate, location.state]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  // Don't render sign-in form if user is already authenticated
  if (user && profile) {
    return (
      <div className="text-center py-8">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Render sign-in form for unauthenticated users
  return <SignInForm />;
};

export default SignInPage;