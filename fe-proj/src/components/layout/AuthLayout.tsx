// src/components/layout/AuthLayout.tsx - Completely remove redirect logic to stop loops
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/auth/AuthContext'; 
import { Loader2, Car } from 'lucide-react';
import AppLogo from '@/components/ui/app-icon';
import { APP_CONFIG} from '@/lib/constants';
const AuthLayout: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // REMOVED ALL REDIRECT LOGIC - Let ProtectedRoute handle redirects
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content Area - Centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Logo and Brand - Centered */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <AppLogo className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-blue-600">{APP_CONFIG.name}</h1>
            <p className="text-gray-600 mt-2">
              Manage your organization's vehicle fleet with ease
            </p>
          </div>
          
          {/* This is where SignInPage/SignUpPage will be rendered */}
          <div className="flex justify-center">
            <Outlet />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500 border-t bg-white">
        <div className="container mx-auto px-4">
          &copy; {new Date().getFullYear()} Fleet Management System
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;