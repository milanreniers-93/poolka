// src/contexts/auth/AuthContext.tsx - Migrated to use backend API
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api'; // ✅ Import our new API client
import type {
  UserRole,
  Profile,
  Organization,
  SignUpUserData,
  SignUpOrganizationData,
  SignUpResult,
  AuthContextType,
  ProfileUpdate,
  OrganizationUpdate,
} from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session from Supabase (still needed for auth state)
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('AuthContext: Initial session:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: Loading user data for initial session...');
          await loadUserData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: User authenticated, loading data...');
          setLoading(true);
          
          const timeoutId = setTimeout(() => {
            console.warn('AuthContext: loadUserData timeout - forcing loading to false');
            setLoading(false);
          }, 10000);
          
          try {
            await loadUserData(session.user.id);
            clearTimeout(timeoutId);
          } catch (error) {
            console.error('AuthContext: Error in auth state change loadUserData:', error);
            clearTimeout(timeoutId);
            setLoading(false);
          }
          
          handlePostAuthRedirect(event);
        } else {
          console.log('AuthContext: User signed out, clearing data...');
          setProfile(null);
          setOrganization(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePostAuthRedirect = (event: string) => {
    if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && window.location.pathname === '/') {
      console.log('AuthContext: Redirecting from landing page to dashboard');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    }
  };

  // ✅ TEMPORARY: Use Supabase directly for profile loading until backend is ready
  const loadUserData = async (userId: string) => {
    try {
      console.log('AuthContext: loadUserData starting for userId:', userId);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 15000);
      });
      
      // ⚠️ TEMPORARY: Use Supabase directly until backend endpoints are ready
      console.log('AuthContext: Fetching profile from Supabase (temp fallback)...');
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: profileData, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);
      
      console.log('AuthContext: Profile query completed');
      console.log('AuthContext: Profile data received:', {
        hasData: !!profileData,
        profileId: profileData?.id,
        role: profileData?.role,
        organizationId: profileData?.organization_id
      });

      if (profileError) {
        console.error('AuthContext: Error loading profile:', profileError);
        
        // Check if it's a "no rows" error (profile doesn't exist)
        if (profileError.code === 'PGRST116') {
          console.warn('AuthContext: Profile not found - attempting to create...');
          await createMissingProfile(userId);
          return;
        }
        
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.warn('AuthContext: No profile data returned');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('AuthContext: Setting profile data');
      setProfile(profileData);

      // ⚠️ TEMPORARY: Load organization using Supabase until backend is ready
      if (profileData.organization_id) {
        console.log('AuthContext: Loading organization:', profileData.organization_id);
        
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select(`
              *,
              pricing_plans (
                id,
                name,
                price_monthly,
                max_vehicles,
                max_employees
              )
            `)
            .eq('id', profileData.organization_id)
            .single();
          
          console.log('AuthContext: Organization query result:', { 
            hasData: !!orgData,
            orgId: orgData?.id,
            orgName: orgData?.name
          });

          if (orgError) {
            console.error('AuthContext: Error loading organization:', orgError);
            setOrganization(null);
          } else {
            console.log('AuthContext: Setting organization data');
            setOrganization(orgData);
          }
        } catch (orgError) {
          console.error('AuthContext: Error loading organization:', orgError);
          setOrganization(null);
        }
      } else {
        console.log('AuthContext: No organization_id in profile');
        setOrganization(null);
      }

      console.log('AuthContext: loadUserData completed successfully');
      
    } catch (error) {
      console.error('AuthContext: Error in loadUserData:', error);
      
      if (error.message === 'Query timeout') {
        console.error('AuthContext: Database query timed out - possible connection issues');
      }
      
      setProfile(null);
      setOrganization(null);
    } finally {
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };
  
  // ⚠️ TEMPORARY: Helper function to create missing profile using Supabase
  const createMissingProfile = async (userId: string) => {
    try {
      console.log('AuthContext: Attempting to create missing profile...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const profileData = {
        id: userId,
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'driver' as const,
        is_active: true,
      };

      // ⚠️ TEMPORARY: Use Supabase directly until backend profile creation endpoint is ready
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('AuthContext: Failed to create profile:', error);
        throw error;
      }

      console.log('AuthContext: Created missing profile:', data);
      setProfile(data);
      
    } catch (error) {
      console.error('AuthContext: Error creating missing profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ MIGRATED: Use backend API for signup
  const signUp = async (
    userData: SignUpUserData, 
    organizationData: SignUpOrganizationData
  ): Promise<SignUpResult> => {
    try {
      console.log('AuthContext: Starting signup process...');
      
      // ✅ Use backend API for complete signup process
      const result = await api.auth.signUp(userData, organizationData);
      
      console.log('AuthContext: Signup process completed via backend');
      return result;

    } catch (error: any) {
      console.error('AuthContext: Signup process failed:', error);
      throw error;
    }
  };

  // ✅ Keep Supabase for auth sign in (since it handles session management)
  const signIn = async (email: string, password: string): Promise<void> => {
    console.log('AuthContext: Signing in user...');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      console.error('AuthContext: Sign in error:', error);
      throw error;
    }
    
    console.log('AuthContext: Sign in successful');
  };

  // ✅ Keep Supabase for sign out (session management)
  const signOut = async (): Promise<void> => {
    console.log('AuthContext: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthContext: Sign out error:', error);
      throw error;
    }
    console.log('AuthContext: Sign out successful');
  };

  // ✅ MIGRATED: Use backend API for profile updates
  const updateProfile = async (updates: ProfileUpdate): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    await api.profile.updateProfile(user.id, updates);
    
    // Refresh profile data
    await loadUserData(user.id);
  };

  // ✅ MIGRATED: Use backend API for organization updates
  const updateOrganization = async (updates: OrganizationUpdate): Promise<void> => {
    if (!profile?.organization_id) {
      throw new Error('No organization associated with user');
    }

    await api.organization.updateOrganization(profile.organization_id, updates);
    
    // Refresh user data
    await loadUserData(user!.id);
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      setLoading(true);
      await loadUserData(user.id);
    }
  };

  // ✅ MIGRATED: Use backend API for user invitations
  const inviteUsers = async (emails: string[], role: UserRole = 'driver'): Promise<void> => {
    console.log('🚀 Starting invitation process for emails:', emails);
    console.log('📋 Role:', role);
    console.log('🏢 Organization ID:', profile?.organization_id);
    
    if (!profile?.organization_id) {
      throw new Error('No organization found');
    }

    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // ✅ Use backend API for invitations
      const result = await api.auth.inviteUsers(emails, role, profile.organization_id);
      console.log('✅ Invitations sent successfully:', result);
      
    } catch (error) {
      console.error('❌ Error sending invitations:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    organization,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateOrganization,
    refreshProfile,
    inviteUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};