// src/pages/LandingPage.tsx - Updated with app constants and logo
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ← ADD THIS IMPORT
import { useAuth } from '@/contexts/auth/AuthContext';
import { Check, ArrowRight, Star, Users, Calendar, Car } from 'lucide-react';
import { APP_CONFIG, getPageTitle } from '@/lib/constants';
import AppLogo from '@/components/ui/app-icon';

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate(); // ← ADD THIS LINE
  const [selectedPlan, setSelectedPlan] = useState('pro');

  // Set document title
  useEffect(() => {
    document.title = getPageTitle();
  }, []);

  // Remove redirect logic - Index component handles this now

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small teams with basic fleet needs',
      trialText: `${APP_CONFIG.features.trialDays}-day free trial, then $29/month`,
      features: [
        'Up to 5 vehicles',
        'Up to 15 employees',
        'Basic booking calendar',
        'Email notifications',
        'Mobile app access',
        'Basic reporting'
      ],
      highlighted: false,
      stripeProductId: 'price_starter_monthly'
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'Best for growing companies with active fleets',
      trialText: `${APP_CONFIG.features.trialDays}-day free trial, then $79/month`,
      features: [
        'Up to 20 vehicles',
        'Up to 50 employees',
        'Advanced booking calendar',
        'SMS & email notifications',
        'Mobile app access',
        'Advanced reporting & analytics',
        'Vehicle maintenance tracking',
        'Custom booking rules',
        'Priority support'
      ],
      highlighted: true,
      stripeProductId: 'price_pro_monthly'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For larger organizations with complex needs',
      trialText: `${APP_CONFIG.features.trialDays}-day free trial, then $199/month`,
      features: [
        'Unlimited vehicles',
        'Unlimited employees',
        'Advanced booking calendar',
        'SMS & email notifications',
        'Mobile app access',
        'Advanced reporting & analytics',
        'Vehicle maintenance tracking',
        'Custom booking rules',
        'Multi-location support',
        'API access',
        'Dedicated account manager',
        'Custom integrations'
      ],
      highlighted: false,
      stripeProductId: 'price_enterprise_monthly'
    }
  ];

  const handleCreateAccount = (planId: string) => {
    const plan = pricingPlans.find(p => p.id === planId);
    // Use navigate instead of window.location.href
    navigate(`/sign-up?plan=${planId}&priceId=${plan?.stripeProductId}`);
  };

  const handleSignIn = () => {
    // Use navigate instead of window.location.href
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <AppLogo size="lg" color="white" />
            <div className="text-2xl font-bold text-white">
              {APP_CONFIG.name}
            </div>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
          </div>
          <button 
            onClick={handleSignIn}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Ditch the Excel
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Chaos
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {APP_CONFIG.meta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => handleCreateAccount(selectedPlan)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105"
            >
              Start {APP_CONFIG.features.trialDays}-Day Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border border-gray-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Startups & SMEs Choose {APP_CONFIG.name}
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Built specifically for growing companies tired of managing their car fleet in spreadsheets
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 hover:bg-gray-800/70 transition-all">
            <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">No More Excel Hell</h3>
            <p className="text-gray-300">
              Stop wrestling with complicated spreadsheets. Our intuitive booking system lets employees reserve cars in seconds, not minutes.
            </p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 hover:bg-gray-800/70 transition-all">
            <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Car className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Real-Time Fleet Overview</h3>
            <p className="text-gray-300">
              See which cars are available instantly. No more double bookings, no more angry phone calls from stranded employees.
            </p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 hover:bg-gray-800/70 transition-all">
            <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Built for Small Teams</h3>
            <p className="text-gray-300">
              Perfect for startups and SMEs. No complex enterprise features you don't need - just simple, effective car booking.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all hover:scale-105 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-purple-600/20 to-pink-600/20 border-2 border-purple-500'
                  : 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <p className="text-sm text-purple-300">{plan.trialText}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCreateAccount(plan.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Start {APP_CONFIG.features.trialDays}-Day Free Trial
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Escape Excel Hell?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of startups and SMEs who've already ditched spreadsheets for stress-free fleet management.
          </p>
          <button 
            onClick={() => handleCreateAccount(selectedPlan)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 mx-auto transition-all transform hover:scale-105"
          >
            Start Your {APP_CONFIG.features.trialDays}-Day Free Trial
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <AppLogo size="md" color="white" />
              <div className="text-2xl font-bold text-white">{APP_CONFIG.name}</div>
            </div>
            <p className="text-gray-400 mb-6">
              © 2025 {APP_CONFIG.name}. All rights reserved.
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href={`mailto:${APP_CONFIG.social.support}`} className="text-gray-400 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;