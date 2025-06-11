// src/contexts/auth/AuthContext.tsx - Fixed version with reliable loading states
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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

const API_BASE_URL = import.meta.env.VITE_API_URL;
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
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to track loading state and prevent race conditions
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe loading state setter with timeout protection
  const setLoadingWithTimeout = (isLoading: boolean, timeoutMs: number = 10000) => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setLoading(isLoading);
    isLoadingRef.current = isLoading;

    // If setting loading to true, add timeout protection
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('AuthContext: Loading timeout - forcing loading to false');
        if (isLoadingRef.current) {
          setLoading(false);
          isLoadingRef.current = false;
        }
      }, timeoutMs);
    }
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          setLoadingWithTimeout(false);
          setInitialized(true);
          return;
        }
        
        console.log('AuthContext: Initial session:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: Loading user data for initial session...');
          await loadUserData(session.user.id, isMounted);
        } else {
          setLoadingWithTimeout(false);
        }
        
        if (isMounted) {
          setInitialized(true);
        }
        
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error);
        if (isMounted) {
          setLoadingWithTimeout(false);
          setInitialized(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('AuthContext: Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: User authenticated, loading data...');
          setLoadingWithTimeout(true);
          
          try {
            await loadUserData(session.user.id, isMounted);
          } catch (error) {
            console.error('AuthContext: Error in auth state change:', error);
            if (isMounted) {
              setLoadingWithTimeout(false);
            }
          }
          
          // Handle redirects after successful auth
          handlePostAuthRedirect(event);
        } else {
          console.log('AuthContext: User signed out, clearing data...');
          setProfile(null);
          setOrganization(null);
          setLoadingWithTimeout(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handlePostAuthRedirect = (event: string) => {
    // Only redirect from landing page and only for specific events
    if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && window.location.pathname === '/') {
      console.log('AuthContext: Redirecting from landing page to dashboard');
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    }
  };

  const loadUserData = async (userId: string, isMounted: boolean = true) => {
    try {
      console.log('AuthContext: loadUserData starting for userId:', userId);
      
      // Load user profile
      console.log('AuthContext: Querying profiles table...');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!isMounted) return;

      console.log('AuthContext: Profile query completed');
      console.log('AuthContext: Profile query result:', { 
        hasData: !!profileData, 
        error: profileError?.message,
        errorCode: profileError?.code,
      });

      if (profileError) {
        console.error('AuthContext: Error loading profile:', profileError);
        
        // Check if it's a "no rows" error (profile doesn't exist)
        if (profileError.code === 'PGRST116') {
          console.warn('AuthContext: Profile not found - attempting to create');
          await createMissingProfile(userId, isMounted);
          return;
        }
        
        setProfile(null);
        setLoadingWithTimeout(false);
        return;
      }

      if (!profileData) {
        console.warn('AuthContext: No profile data returned');
        setProfile(null);
        setLoadingWithTimeout(false);
        return;
      }

      console.log('AuthContext: Setting profile data');
      setProfile(profileData);

      // Load organization if user has one
      if (profileData.organization_id) {
        console.log('AuthContext: Loading organization:', profileData.organization_id);
        
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

        if (!isMounted) return;

        console.log('AuthContext: Organization query result:', { 
          hasData: !!orgData, 
          error: orgError?.message 
        });

        if (orgError) {
          console.error('AuthContext: Error loading organization:', orgError);
          setOrganization(null);
        } else {
          console.log('AuthContext: Setting organization data');
          setOrganization(orgData);
        }
      } else {
        console.log('AuthContext: No organization_id in profile');
        setOrganization(null);
      }

      console.log('AuthContext: loadUserData completed successfully');
      
    } catch (error) {
      console.error('AuthContext: Unexpected error in loadUserData:', error);
      
      if (isMounted) {
        setProfile(null);
        setOrganization(null);
      }
    } finally {
      // ALWAYS set loading to false if component is still mounted
      if (isMounted) {
        console.log('AuthContext: Setting loading to false');
        setLoadingWithTimeout(false);
      }
    }
  };
  
  // Helper function to create missing profile
  const createMissingProfile = async (userId: string, isMounted: boolean = true) => {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (!isMounted) return;

      if (error) {
        console.error('AuthContext: Failed to create profile:', error);
        throw error;
      }

      console.log('AuthContext: Created missing profile:', data);
      setProfile(data);
      
    } catch (error) {
      console.error('AuthContext: Error creating missing profile:', error);
      if (isMounted) {
        setProfile(null);
      }
    } finally {
      if (isMounted) {
        setLoadingWithTimeout(false);
      }
    }
  };

  const signUp = async (
    userData: SignUpUserData, 
    organizationData: SignUpOrganizationData
  ): Promise<SignUpResult> => {
    try {
      console.log('AuthContext: Starting signup process...');
      
      // Step 1: Create organization first
      console.log('AuthContext: Creating organization...');
      const orgInsertData = {
        name: organizationData.name,
        email: organizationData.email,
        phone: organizationData.phone,
        address_line_1: organizationData.addressLine1,
        address_line_2: organizationData.addressLine2,
        city: organizationData.city,
        state_province: organizationData.stateProvince,
        postal_code: organizationData.postalCode,
        country: organizationData.country,
        industry: organizationData.industry,
        company_size: organizationData.companySize,
        fleet_size: organizationData.fleetSize,
        pricing_plan_id: organizationData.pricingPlanId,
        subscription_status: 'trial' as const, 
      };

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert(orgInsertData)
        .select()
        .single();

      if (orgError) {
        console.error('AuthContext: Organization creation error:', orgError);
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      console.log('AuthContext: Organization created:', orgData.id);

      // Step 2: Create auth user
      console.log('AuthContext: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            organization_id: orgData.id,
            role: userData.role,
            license_number: userData.licenseNumber,
            license_expiry: userData.licenseExpiry,
          }
        }
      });

      if (authError) {
        console.error('AuthContext: Auth user creation error:', authError);
        // Clean up organization if user creation failed
        await supabase.from('organizations').delete().eq('id', orgData.id);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('User creation succeeded but no user data returned');
      }

      console.log('AuthContext: Auth user created:', authData.user.id);

      // Step 3: Upsert profile (handle trigger-created profiles)
      console.log('AuthContext: Upserting profile...');
      const profileData = {
        id: authData.user.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        license_number: userData.licenseNumber,
        license_expiry: userData.licenseExpiry,
        organization_id: orgData.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        console.error('AuthContext: Profile creation error:', profileError);
        // This is critical - if profile creation fails, cleanup
        await supabase.from('organizations').delete().eq('id', orgData.id);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('AuthContext: Profile created successfully');
      console.log('AuthContext: Signup process completed');

      return {
        user: authData.user,
        organization: orgData,
        profile: profile,
      };

    } catch (error: any) {
      console.error('AuthContext: Signup process failed:', error);
      throw error;
    }
  };

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

  const signOut = async (): Promise<void> => {
    try {
      console.log('AuthContext: Starting sign out process...');
      
      // Clear local state immediately
      console.log('AuthContext: Clearing local state...');
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSession(null);
      setLoadingWithTimeout(false);
      
      // Clear local storage
      console.log('AuthContext: Clearing local storage...');
      try {
        localStorage.removeItem('fleet-flow-auth');
        
        // Clear any Supabase auth keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth'))) {
            console.log('AuthContext: Removing auth key:', key);
            localStorage.removeItem(key);
          }
        }
      } catch (storageError) {
        console.warn('AuthContext: Error clearing localStorage:', storageError);
      }
      
      // Sign out from Supabase
      console.log('AuthContext: Calling Supabase signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Supabase sign out error:', error);
        // Don't throw error - we already cleared local state
        console.warn('AuthContext: Continuing with local sign out despite Supabase error');
      } else {
        console.log('AuthContext: Supabase sign out successful');
      }
      
      // Force redirect to login page
      console.log('AuthContext: Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/sign-in'; // Updated to match your route
      }, 100);
      
      console.log('AuthContext: Sign out process completed');
      
    } catch (error) {
      console.error('AuthContext: Unexpected error during sign out:', error);
      
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSession(null);
      setLoadingWithTimeout(false);
      
      setTimeout(() => {
        window.location.href = '/sign-in'; // Updated to match your route
      }, 100);
    }
  };

  const updateProfile = async (updates: ProfileUpdate): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    // Refresh profile data
    await loadUserData(user.id);
  };

  const updateOrganization = async (updates: OrganizationUpdate): Promise<void> => {
    if (!profile?.organization_id) {
      throw new Error('No organization associated with user');
    }

    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', profile.organization_id);

    if (error) {
      throw error;
    }

    // Refresh user data
    await loadUserData(user!.id);
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      setLoadingWithTimeout(true);
      await loadUserData(user.id);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/api/invite-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          emails,
          role,
          organization_id: profile.organization_id,
          invited_by: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
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
    loading: loading && !initialized, // Don't show loading after first initialization
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