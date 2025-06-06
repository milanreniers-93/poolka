// src/contexts/auth/types.ts - Updated with plan support
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'fleet_manager' | 'driver';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  license_number?: string;
  license_expiry?: string;
  organization_id: string;
  avatar_url?: string;
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
  company_size?: CompanySize;
  fleet_size?: number;
  pricing_plan_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trial_ends_at?: string;
  subscription_current_period_start?: string;
  subscription_current_period_end?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  licenseNumber?: string;
  licenseExpiry?: string;
}

export interface SignUpOrganizationData {
  name: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  country: string;
  industry?: string;
  companySize?: CompanySize;
  fleetSize?: number;
  pricingPlanId?: string; // Added for plan selection
}

export interface SignUpResult {
  user: User;
  organization: Organization;
  profile: Profile;
}

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  avatar_url?: string;
}

export interface OrganizationUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  industry?: string;
  company_size?: CompanySize;
  fleet_size?: number;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  signUp: (userData: SignUpUserData, organizationData: SignUpOrganizationData) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  updateOrganization: (updates: OrganizationUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  inviteUsers: (emails: string[], role?: UserRole) => Promise<void>;
}

export interface ValidationErrors {
  [key: string]: string;
}