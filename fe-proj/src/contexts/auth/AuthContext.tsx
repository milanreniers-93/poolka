// src/contexts/auth/AuthContext.tsx - Rewritten with proper loading management
import React, { createContext, useContext, useEffect, useState } from 'react';
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
const API_BASE_URL = import.meta.env.VITE_API_URL
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
    // Get initial session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: User authenticated, loading data...');
          
          // Set loading true when starting to load user data
          setLoading(true);
          
          // Add timeout protection
          const timeoutId = setTimeout(() => {
            console.warn('AuthContext: loadUserData timeout - forcing loading to false');
            setLoading(false);
          }, 10000); // 10 second timeout
          
          try {
            await loadUserData(session.user.id);
            clearTimeout(timeoutId);
          } catch (error) {
            console.error('AuthContext: Error in auth state change loadUserData:', error);
            clearTimeout(timeoutId);
            setLoading(false);
          }
          
          // Handle redirects after successful auth
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
    // Only redirect from landing page and only for specific events
    if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && window.location.pathname === '/') {
      console.log('AuthContext: Redirecting from landing page to dashboard');
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('AuthContext: loadUserData starting for userId:', userId);
      
      // Add timeout promise for debugging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 15000); // 15 seconds
      });
      
      // Load user profile with detailed logging and timeout
      console.log('AuthContext: Querying profiles table...');
      console.log('AuthContext: Using Supabase URL:', supabase.supabaseUrl);
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
  
      // Race between the query and timeout
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]);
  
      console.log('AuthContext: Profile query completed');
      console.log('AuthContext: Profile query result:', { 
        hasData: !!profileData, 
        error: profileError?.message,
        errorCode: profileError?.code,
        errorDetails: profileError?.details,
        errorHint: profileError?.hint,
        profileData: profileData ? { 
          id: profileData.id, 
          email: profileData.email, 
          role: profileData.role,
          organization_id: profileData.organization_id 
        } : null
      });
  
      if (profileError) {
        console.error('AuthContext: Error loading profile:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // Check if it's a "no rows" error (profile doesn't exist)
        if (profileError.code === 'PGRST116') {
          console.warn('AuthContext: Profile not found - user may need to complete signup');
          // Try to create a basic profile
          await createMissingProfile(userId);
          return;
        }
        
        // Check if it's an RLS policy error
        if (profileError.message?.includes('policy')) {
          console.error('AuthContext: RLS policy blocking profile access');
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
  
      // Load organization if user has one
      if (profileData.organization_id) {
        console.log('AuthContext: Loading organization:', profileData.organization_id);
        
        const orgPromise = supabase
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
  
        const { data: orgData, error: orgError } = await Promise.race([
          orgPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Org query timeout')), 10000))
        ]);
  
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
      
      if (error.message === 'Query timeout') {
        console.error('AuthContext: Database query timed out - possible connection issues');
      }
      
      setProfile(null);
      setOrganization(null);
    } finally {
      // ALWAYS set loading to false
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };
  
  // Helper function to create missing profile
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
        role: 'driver' as const, // Default role
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
  
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
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
        subscription_status: 'free' as const, // Start with free instead of trial
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

      // Step 3: Explicitly create profile (don't rely on triggers)
      console.log('AuthContext: Creating profile...');
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData) // Use insert instead of upsert for new users
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
    console.log('AuthContext: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthContext: Sign out error:', error);
      throw error;
    }
    console.log('AuthContext: Sign out successful');
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
      setLoading(true);
      await loadUserData(user.id);
    }
  };

// Updated inviteUsers function in AuthContext.tsx
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
    // Call your backend API endpoint instead of admin function
    const response = await fetch(`${API_BASE_URL}/api/invite-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth token if needed
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