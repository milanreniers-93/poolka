// Component to show current plan in profile/organization section
import React from 'react';
import { Crown, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useOrganizationPlan } from '@/hooks/useOrganizationPlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OrganizationPlanDisplay: React.FC = () => {
  const { 
    plan, 
    subscriptionStatus, 
    isTrialActive, 
    daysLeftInTrial, 
    trialEndsAt,
    loading 
  } = useOrganizationPlan();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPlanStatusColor = () => {
    switch (subscriptionStatus) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'trial': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'past_due': return 'text-red-600 bg-red-50 border-red-200';
      case 'canceled': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'free': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPlanStatusIcon = () => {
    switch (subscriptionStatus) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'trial': return <Calendar className="h-4 w-4" />;
      case 'past_due': return <AlertCircle className="h-4 w-4" />;
      case 'free': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPlanStatusText = () => {
    switch (subscriptionStatus) {
      case 'active': return 'Active Subscription';
      case 'trial': return `Free Trial (${daysLeftInTrial} days left)`;
      case 'past_due': return 'Payment Past Due';
      case 'canceled': return 'Canceled';
      case 'free': return 'Free Account';
      default: return 'Unknown Status';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Details */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {plan?.name || 'Free Plan'}
            </h3>
            <p className="text-sm text-gray-600">
              {plan?.description || 'Basic fleet management features'}
            </p>
          </div>
          <div className="text-right">
            {plan ? (
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${plan.price_monthly}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-green-600">Free</p>
                <p className="text-sm text-gray-500">forever</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${getPlanStatusColor()}`}>
          {getPlanStatusIcon()}
          <span className="text-sm font-medium">
            {getPlanStatusText()}
          </span>
        </div>

        {/* Plan Features */}
        {plan?.features && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Features</h4>
            <ul className="space-y-1">
              {plan.features.slice(0, 4).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {feature}
                </li>
              ))}
              {plan.features.length > 4 && (
                <li className="text-sm text-gray-500">
                  +{plan.features.length - 4} more features
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Plan Limits */}
        {plan && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Vehicle Limit</p>
              <p className="font-medium">
                {plan.max_vehicles ? `${plan.max_vehicles} vehicles` : 'Unlimited'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee Limit</p>
              <p className="font-medium">
                {plan.max_employees ? `${plan.max_employees} employees` : 'Unlimited'}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {subscriptionStatus === 'free' && (
            <Button className="flex-1">
              Upgrade Plan
            </Button>
          )}
          {subscriptionStatus === 'trial' && (
            <Button className="flex-1">
              Subscribe Now
            </Button>
          )}
          {subscriptionStatus === 'active' && (
            <Button variant="outline" className="flex-1">
              Manage Subscription
            </Button>
          )}
          {subscriptionStatus === 'past_due' && (
            <Button className="flex-1 bg-red-600 hover:bg-red-700">
              Update Payment
            </Button>
          )}
        </div>

        {/* Trial Warning */}
        {isTrialActive && daysLeftInTrial <= 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Your trial expires in {daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''}. 
                Subscribe now to continue using premium features.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizationPlanDisplay;