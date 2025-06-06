// src/components/layout/Navbar.tsx - Fixed version
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../contexts/auth/AuthContext'; 
import { usePermissions } from '../auth/RoleBasedAccess'; 
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Calendar, 
  Settings, 
  CreditCard, 
  Users,  
  LogOut, 
  User,
  Shield
} from 'lucide-react';
import AppLogo from '@/components/ui/app-icon';
import { APP_CONFIG} from '@/lib/constants';

const Navbar: React.FC = () => {
  const { user, profile, organization, signOut } = useAuth();
  const { canManageFleet, canViewUsers, isAdmin, isFleetManager } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const handleSignOut = async () => {
    console.log('🚪 Starting sign out process...');
    try {
      await signOut();
      console.log('✅ Sign out successful, redirecting...');
      navigate('/sign-in', { replace: true });
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const userInitials = profile 
    ? getInitials(profile.first_name, profile.last_name) 
    : 'U';

  const getRoleColor = () => {
    if (!profile) return 'bg-gray-500';
    switch (profile.role) {
      case 'admin': return 'bg-red-500';
      case 'fleet_manager': return 'bg-blue-500';
      case 'driver': return 'bg-green-500';
      case 'viewer': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleBadge = () => {
    if (!profile) return null;
    
    const roleConfig = {
      admin: { label: 'Administrator', color: 'text-red-600 bg-red-50 border-red-200' },
      fleet_manager: { label: 'Fleet Manager', color: 'text-blue-600 bg-blue-50 border-blue-200' },
      driver: { label: 'Driver', color: 'text-green-600 bg-green-50 border-green-200' },
      viewer: { label: 'Viewer', color: 'text-gray-600 bg-gray-50 border-gray-200' },
    };
    
    const config = roleConfig[profile.role as keyof typeof roleConfig] || roleConfig.viewer;
    
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
        {(profile.role === 'admin' || profile.role === 'fleet_manager') && (
          <Shield className="h-3 w-3" />
        )}
        {config.label}
      </span>
    );
  };

  const navigationItems = [
    {
      label: 'My Bookings',
      path: '/bookings',
      icon: Calendar,
      show: true
    },
    {
      label: 'Fleet Manager',
      path: '/fleet-manager',
      icon: Car,
      show: canManageFleet
    },
    {
      label: 'Users',
      path: '/users',
      icon: Users,
      show: canViewUsers // Changed from isAdmin to canViewUsers (includes fleet managers)
    }
  ];

  if (!user || !profile) {
    return null;
  }

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <AppLogo size="lg" color="white" />
              <div>
                <span className="font-bold text-xl text-gray-900">{APP_CONFIG.name}</span>
                <div className="text-xs text-gray-500">
                  {organization?.name || 'Loading...'}
                </div>
              </div>
            </Link>
            
            {/* Main Navigation */}
            <div className="hidden md:flex space-x-1">
              {navigationItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/'
                  : isActivePath(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/bookings/new')}
              className="hidden sm:flex"
            >
              <Calendar className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${getRoleColor()} text-white font-medium`}>
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{profile.email}</p>
                    <div className="flex items-center">
                      {getRoleBadge()}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Mobile Navigation */}
                <div className="md:hidden">
                  {navigationItems.filter(item => item.show).map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem 
                        key={item.path}
                        onSelect={() => navigate(item.path)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem onSelect={() => navigate('/bookings/new')} className="sm:hidden">
                    <Calendar className="h-4 w-4 mr-2" />
                    New Booking
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                
                {/* Profile */}
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>

                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/billing')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing & Plans</span>
                </DropdownMenuItem>
                )}

                {/* Settings - Available to all users now */}
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Sign Out */}
                <DropdownMenuItem 
                  onSelect={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;