// src/pages/BillingPlansPage.tsx - Billing & Plans management page
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  CheckCircle, 
  Star,
  AlertCircle,
  Receipt,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import OrganizationPlanDisplay from '../components/fleet-manager/OrganizationPlanDisplay';
import { APP_CONFIG, getPageTitle } from '@/lib/constants';

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
  is_active: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

interface BillingHistory {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  invoice_url?: string;
  description: string;
}

const BillingPlansPage: React.FC = () => {
  const { organization, profile } = useAuth();
  const [availablePlans, setAvailablePlans] = useState<PricingPlan[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = getPageTitle('Billing & Plans');
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load available pricing plans
      const { data: plans, error: plansError } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (plansError) throw plansError;
      setAvailablePlans(plans || []);

      // TODO: Load billing history from Stripe
      // For now, using mock data
      setBillingHistory([
        {
          id: '1',
          amount: 79.00,
          status: 'paid',
          date: '2025-01-15',
          description: 'Professional Plan - January 2025'
        },
        {
          id: '2',
          amount: 79.00,
          status: 'paid',
          date: '2024-12-15',
          description: 'Professional Plan - December 2024'
        }
      ]);

    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      // TODO: Integrate with Stripe for plan upgrade
      console.log('Upgrading to plan:', planId);
      
      // For now, just show success message
      alert('Plan upgrade initiated! You will be redirected to payment.');
      
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = () => {
    // TODO: Redirect to Stripe customer portal
    console.log('Opening Stripe billing portal...');
    alert('Redirecting to billing portal...');
  };

  const renderPlanCard = (plan: PricingPlan) => {
    const isCurrentPlan = organization?.pricing_plan_id === plan.id;
    const isFreeAccount = !organization?.pricing_plan_id;
    
    return (
      <Card key={plan.id} className={`relative ${plan.is_highlighted ? 'border-purple-500 border-2' : ''}`}>
        {plan.is_highlighted && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-purple-600 text-white px-3 py-1 flex items-center gap-1">
              <Star className="h-3 w-3" />
              Most Popular
            </Badge>
          </div>
        )}
        
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>
          <div className="mt-4">
            <span className="text-3xl font-bold">${plan.price_monthly}</span>
            <span className="text-gray-500">/month</span>
          </div>
          {plan.price_yearly && (
            <p className="text-sm text-green-600">
              Save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(0)} with yearly billing
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <ul className="space-y-2 mb-6">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <div className="flex justify-between">
              <span>Vehicles:</span>
              <span>{plan.max_vehicles ? `Up to ${plan.max_vehicles}` : 'Unlimited'}</span>
            </div>
            <div className="flex justify-between">
              <span>Employees:</span>
              <span>{plan.max_employees ? `Up to ${plan.max_employees}` : 'Unlimited'}</span>
            </div>
          </div>
          
          {isCurrentPlan ? (
            <Button disabled className="w-full" variant="outline">
              Current Plan
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => handleUpgrade(plan.id)}
              disabled={upgrading === plan.id}
              variant={plan.is_highlighted ? 'default' : 'outline'}
            >
              {upgrading === plan.id ? 'Processing...' : 'Upgrade to This Plan'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderBillingHistory = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>
          Your recent payments and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {billingHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No billing history available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {billingHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'paid' ? 'bg-green-500' : 
                    item.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${item.amount.toFixed(2)}</span>
                  <Badge variant={
                    item.status === 'paid' ? 'default' : 
                    item.status === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {item.status}
                  </Badge>
                  {item.invoice_url && (
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrganizationPlanDisplay />
        </div>
        
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={handleManageBilling}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoices
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Usage Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Plans</h2>
        <p className="text-gray-600 mb-6">
          Choose the plan that best fits your fleet management needs
        </p>
        
        {/* Free Plan Notice */}
        {!organization?.pricing_plan_id && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're currently on the <strong>Free Plan</strong>. Upgrade to unlock advanced features and remove limitations.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Free Plan Card */}
          <Card className={!organization?.pricing_plan_id ? 'border-green-500 border-2' : ''}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Free Plan</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold text-green-600">Free</span>
                <span className="text-gray-500">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Up to 3 vehicles
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Up to 10 employees
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Basic booking calendar
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Email notifications
                </li>
              </ul>
              
              {!organization?.pricing_plan_id ? (
                <Button disabled className="w-full" variant="outline">
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full" variant="outline" disabled>
                  Downgrade
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Paid Plans */}
          {availablePlans.map(renderPlanCard)}
        </div>
      </div>

      <Separator />

      {/* Billing History */}
      {renderBillingHistory()}

      {/* Footer Info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600">
                All payments are processed securely through Stripe
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cancel Anytime</h3>
              <p className="text-sm text-gray-600">
                No long-term contracts. Cancel or change plans anytime
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600">
                Get help when you need it from our support team
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPlansPage;