// src/pages/SignUpPage.tsx - Complete rewrite with dashboard redirect
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SignUpForm from '../components/auth/SignUpForm';

const SignUpPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user && profile) {
      // Always redirect to dashboard for authenticated users
      const redirectTo = '/dashboard';
      console.log('SignUpPage: User already authenticated, redirecting to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, profile, loading, navigate]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Don't render sign-up form if user is already authenticated
  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Render sign-up form for unauthenticated users
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            FleetFlow
          </h2>
          <p className="text-gray-600">
            Start your 7-day free trial
          </p>
        </div>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="px-4 sm:px-0">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;