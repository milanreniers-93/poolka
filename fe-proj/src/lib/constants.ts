// src/lib/constants.ts - Centralized app configuration
export const APP_CONFIG = {
    name: 'FleetFlow',
    tagline: 'Smart Fleet Management',
    description: 'Simple car booking for growing teams',
    url: 'https://fleetflow.app', // Update with your actual domain
    version: '1.0.0',
    
    // SEO & Meta
    meta: {
      title: 'FleetFlow - Smart Fleet Management',
      description: 'Finally, a simple way for your team to book company cars. No more Excel nightmares, double bookings, or frustrated employees.',
      keywords: 'fleet management, car booking, company cars, vehicle management, startup tools',
    },
    
    // Social & Contact
    social: {
      email: 'hello@fleetflow.app',
      support: 'support@fleetflow.app',
      twitter: '@fleetflow',
    },
    
    // Features
    features: {
      trialDays: 7,
      supportEmail: 'support@fleetflow.app',
    }
  } as const;
  
  // Helper function to get page title
  export const getPageTitle = (pageTitle?: string): string => {
    if (pageTitle) {
      return `${pageTitle} - ${APP_CONFIG.name}`;
    }
    return APP_CONFIG.meta.title;
  };
  
  // Helper function to get full app name with tagline
  export const getFullAppName = (): string => {
    return `${APP_CONFIG.name} - ${APP_CONFIG.tagline}`;
  };