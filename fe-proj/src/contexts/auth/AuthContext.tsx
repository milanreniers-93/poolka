// src/contexts/auth/AuthContext.tsx - Updated for backend API integration
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

// Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'fleet_manager' | 'driver' | 'viewer';
  organization_id?: string;
  license_number?: string;
  license_expiry?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province?: string;
  postal_code: string;
  country: string;
  industry?: string;
  company_size?: string;
  subscription_status: string;
  pricing_plan_id?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth storage utilities
const AUTH_STORAGE_KEY = 'fleet-flow-auth';

const saveAuthData = (authData: any) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
};

const getAuthData = () => {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
};

const clearAuthData = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Check for existing auth data
      const authData = getAuthData();
      if (!authData?.access_token) {
        setLoading(false);
        return;
      }

      // Verify session with backend
      const response = await authAPI.getMe();
      
      if (response.user && response.profile) {
        setUser(response.user);
        setProfile(response.profile);
        setSession(authData);
        
        // Load organization if profile has organization_id
        if (response.profile.organization_id) {
          try {
            // You might need to add this to your organizationAPI
            const orgResponse = await fetch(`/api/organizations/me`, {
              headers: {
                'Authorization': `Bearer ${authData.access_token}`,
                'Content-Type': 'application/json'
              }
            });
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setOrganization(orgData);
            }
          } catch (orgError) {
            console.warn('Could not load organization:', orgError);
          }
        }
      } else {
        // Invalid session
        clearAuthData();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await authAPI.signin(email, password);
      
      if (response.session && response.user && response.profile) {
        // Save auth data
        saveAuthData(response.session);
        
        // Update state
        setUser(response.user);
        setProfile(response.profile);
        setSession(response.session);
        
        // Load organization if available
        if (response.profile.organization_id) {
          try {
            const orgResponse = await fetch(`/api/organizations/me`, {
              headers: {
                'Authorization': `Bearer ${response.session.access_token}`,
                'Content-Type': 'application/json'
              }
            });
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              setOrganization(orgData);
            }
          } catch (orgError) {
            console.warn('Could not load organization:', orgError);
          }
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: any) => {
    try {
      setLoading(true);
      
      const response = await authAPI.signup(userData);
      
      if (response.session && response.user && response.profile) {
        // Save auth data
        saveAuthData(response.session);
        
        // Update state
        setUser(response.user);
        setProfile(response.profile);
        setSession(response.session);
        setOrganization(response.organization);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Call backend signout
      await authAPI.signout();
    } catch (error) {
      console.error('Sign out error:', error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Clear local state
      clearAuthData();
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSession(null);
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!profile) throw new Error('No profile to update');
      
      // Call backend API to update profile
      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile.profile);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      const response = await authAPI.getSession();
      
      if (response.user && response.profile) {
        setUser(response.user);
        setProfile(response.profile);
        
        // Update stored session if needed
        const authData = getAuthData();
        if (authData) {
          saveAuthData({ ...authData, ...response });
        }
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      // If refresh fails, clear auth state
      clearAuthData();
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSession(null);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    organization,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;