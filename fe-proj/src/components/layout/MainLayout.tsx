// src/components/layout/MainLayout.tsx
import React from 'react';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/auth/AuthContext'; 
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, profile, loading } = useAuth(); 
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 mt-2">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // If no user or profile, redirect to sign-in
  if (!user || !profile) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      
      <footer className="py-4 border-t bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} Fleet Management System</span>
            <span className="text-xs">
              Welcome, {profile.first_name} {profile.last_name} | {profile.role}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;