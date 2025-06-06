// src/hooks/useOrganizationPlan.ts - Hook to get organization plan details
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth/AuthContext';

interface PricingPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  description: string;
  features: string[];
  max_vehicles?: number;
  max_employees?: number;
  is_highlighted: boolean;
}

interface OrganizationPlan {
  plan: PricingPlan | null;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'free';
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  isTrialActive: boolean;
  daysLeftInTrial: number;
  loading: boolean;
  error: string | null;
}

export const useOrganizationPlan = () => {
  const { organization } = useAuth();
  const [planInfo, setPlanInfo] = useState<OrganizationPlan>({
    plan: null,
    subscriptionStatus: 'free',
    isTrialActive: false,
    daysLeftInTrial: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!organization?.id) {
      setPlanInfo(prev => ({ 
        ...prev, 
        loading: false,
        subscriptionStatus: 'free'
      }));
      return;
    }

    loadOrganizationPlan();
  }, [organization?.id]);

  const loadOrganizationPlan = async () => {
    try {
      setPlanInfo(prev => ({ ...prev, loading: true, error: null }));

      // If no pricing plan is set, user is on free plan
      if (!organization?.pricing_plan_id) {
        setPlanInfo({
          plan: null,
          subscriptionStatus: 'free',
          isTrialActive: false,
          daysLeftInTrial: 0,
          loading: false,
          error: null
        });
        return;
      }

      // Get the pricing plan details
      const { data: plan, error: planError } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('id', organization.pricing_plan_id)
        .single();

      if (planError) {
        throw planError;
      }

      // Calculate trial status
      const now = new Date();
      const trialEndsAt = organization.trial_ends_at ? new Date(organization.trial_ends_at) : null;
      const isTrialActive = organization.subscription_status === 'trial' && trialEndsAt && trialEndsAt > now;
      const daysLeftInTrial = isTrialActive && trialEndsAt 
        ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setPlanInfo({
        plan,
        subscriptionStatus: organization.subscription_status || 'free',
        trialEndsAt: organization.trial_ends_at,
        currentPeriodEnd: organization.subscription_current_period_end,
        isTrialActive,
        daysLeftInTrial,
        loading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Error loading organization plan:', error);
      setPlanInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load plan information'
      }));
    }
  };

  const refreshPlan = () => {
    if (organization?.id) {
      loadOrganizationPlan();
    }
  };

  return { ...planInfo, refreshPlan };
};