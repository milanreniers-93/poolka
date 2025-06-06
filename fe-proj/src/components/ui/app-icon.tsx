import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'dark';
}

const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'md', 
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-purple-600',
    white: 'text-white',
    dark: 'text-gray-900'
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradients for flowing effect */}
        <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
        </linearGradient>
        <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="currentColor" stopOpacity="1"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="flowGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
        </linearGradient>
      </defs>
      
      {/* Top horizontal wavy bar of F */}
      <path
        d="M18 16C18 12 18 12 22 12C28 12 34 8 40 12C46 16 52 12 56 16C56 20 56 20 52 20C46 20 40 24 34 20C28 16 22 20 18 20V16Z"
        fill="url(#flowGradient1)"
      />
      
      {/* Middle horizontal wavy bar of F */}
      <path
        d="M18 30C18 26 18 26 22 26C28 26 34 22 40 26C46 30 50 26 52 30C52 34 52 34 50 34C46 34 40 38 34 34C28 30 22 34 18 34V30Z"
        fill="url(#flowGradient2)"
      />
      
      {/* Bottom wavy element - shorter for F proportions */}
      <path
        d="M18 44C18 40 18 40 22 40C28 40 32 36 36 40C40 44 42 40 44 44C44 48 44 48 42 48C40 48 36 52 32 48C28 44 22 48 18 48V44Z"
        fill="url(#flowGradient3)"
      />
      
      {/* Vertical spine of F - strong and clean */}
      <rect
        x="14"
        y="12"
        width="8"
        height="40"
        rx="4"
        fill="currentColor"
      />
      
      {/* Subtle flowing particles for movement */}
      <g opacity="0.3">
        <circle cx="24" cy="14" r="1" fill="currentColor"/>
        <circle cx="32" cy="18" r="0.8" fill="currentColor"/>
        <circle cx="40" cy="16" r="1.2" fill="currentColor"/>
        <circle cx="28" cy="28" r="0.9" fill="currentColor"/>
        <circle cx="36" cy="32" r="1.1" fill="currentColor"/>
        <circle cx="26" cy="42" r="0.7" fill="currentColor"/>
        <circle cx="34" cy="46" r="1" fill="currentColor"/>
      </g>
    </svg>
  );
};

export default AppLogo;