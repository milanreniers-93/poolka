
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';

/**
 * Fetches the user profile from Supabase or creates one if it doesn't exist
 */
export const fetchOrCreateProfile = async (session: any) => {
  if (!session) return null;
  
  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      throw error;
    }
    
    if (profileData) {
      return profileData as UserProfile;
    } else {
      // If no profile found, create one based on auth user data
      const { first_name, last_name } = session.user.user_metadata || {};
      const newProfile: Partial<UserProfile> = {
        id: session.user.id,
        email: session.user.email || '',
        first_name: first_name || '',
        last_name: last_name || '',
        role: 'user', // Default role
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([newProfile]);

      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }
      
      return newProfile as UserProfile;
    }
  } catch (err) {
    console.error('Error in profile handling:', err);
    throw err;
  }
};

/**
 * Signs in a user with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/**
 * Signs up a new user with email, password and profile information
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string, 
  role: string
) => {
  // First create the user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      }
    }
  });
  
  if (error) throw error;
  
  // Create profile record
  if (data.user) {
    // Use service role to bypass RLS for creating the initial profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role
        },
      ]);
      
    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }
  }
  
  return data;
};

/**
 * Signs out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Check if this is the first user in the system
 */
export const checkIsFirstUser = async () => {
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  if (countError) throw countError;
  
  // Determine if this is the first user
  return count === 0;
};
