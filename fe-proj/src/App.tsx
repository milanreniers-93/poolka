// src/App.tsx - Fixed routing structure
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth Context
import { AuthProvider } from './contexts/auth/AuthContext';

// Layout Components
import MainLayout from "./components/layout/MainLayout";
import AuthLayout from "./components/layout/AuthLayout";

// Auth Components
import { ProtectedRoute } from "./components/auth";

// Common Components
import ErrorBoundary from "./components/common/ErrorBoundary";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import BookingsPage from "./pages/BookingsPage";
import NewBookingPage from "./pages/NewBookingPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import FleetManagerPage from "./pages/FleetManagerPage";
import UserProfilePage from "./pages/UserProfilePage";
import UsersManagementPage from "./pages/UsersManagementPage";
import InviteCompletePage from "./pages/InviteCompletePage";
import BillingPlansPage from "./pages/BillingPlansPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Root Route - Smart redirect based on auth status */}
              <Route path="/" element={<Index />} />
              
              {/* Landing Page - Separate route for marketing */}
              <Route path="/landing" element={<LandingPage />} />
              
              {/* Auth Routes - Wrapped in AuthLayout */}
              <Route element={<AuthLayout />}>
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                <Route path="/invite/complete" element={<InviteCompletePage />} />
              </Route>
              
              {/* Protected Routes - Wrapped in MainLayout */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                {/* Dashboard Route - Also uses Index for role-based redirect */}
                <Route path="/dashboard" element={<Index />} />
                
                {/* Booking Routes */}
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/new" element={<NewBookingPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                
                {/* User Profile Route */}
                <Route path="/profile" element={<UserProfilePage />} />
                
                {/* Users Management Route - Fleet Manager+ access */}
                <Route path="/users" element={
                  <ProtectedRoute requiredRole="fleet_manager">
                    <UsersManagementPage />
                  </ProtectedRoute>
                } />
                
                {/* Fleet Manager Routes - Require fleet_manager or admin role */}
                <Route path="/fleet-manager" element={
                  <ProtectedRoute requiredRole="fleet_manager">
                    <FleetManagerPage />
                  </ProtectedRoute>
                } />
                
                {/* Billing plan Routes - Requires admin role */}
                <Route path="/billing" element={
                  <ProtectedRoute requiredRole="admin">
                    <BillingPlansPage />
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Catch All - 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;