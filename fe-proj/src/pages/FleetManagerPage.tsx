// src/pages/FleetManagerPage.tsx - Clean version without syntax errors
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/auth/AuthContext'; 
import { usePermissions } from '../components/auth/RoleBasedAccess';
import {
  Shield,
  AlertCircle,
  Car,
  Calendar as CalendarIcon,
  BarChart3,
  Wrench,
  Users,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Import components
import CarInfoEditor from '../components/fleet-manager/CarInfoEditor';
import BookingList from '../components/booking/BookingList';
import BookingCalendar from '../components/booking/BookingCalendar';

// Users Management Component (simplified for tab)
const UsersManagement: React.FC = () => {
  const { profile } = useAuth();
  const { canManageFleet, isAdmin, isFleetManager } = usePermissions(); // Fleet managers can access users

  const { data: users, isLoading } = useQuery({
    queryKey: ['organizationUsers', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  // Allow both admins and fleet managers to view users
  if (!canManageFleet) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view user information. Contact your administrator for access.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Users ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-800">{users?.length || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-800">
                  {users?.filter(u => u.is_active).length || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-600">Fleet Managers</p>
                <p className="text-2xl font-bold text-purple-800">
                  {users?.filter(u => u.role === 'fleet_manager').length || 0}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-amber-600">Drivers</p>
                <p className="text-2xl font-bold text-amber-800">
                  {users?.filter(u => u.role === 'driver').length || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {user.phone && (
                      <p className="text-sm text-gray-500">{user.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={
                    user.role === 'admin' ? 'destructive' :
                    user.role === 'fleet_manager' ? 'default' :
                    user.role === 'driver' ? 'secondary' : 'outline'
                  }>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {(!users || users.length === 0) && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">No users in your organization yet.</p>
            </div>
          )}
          
          {!isAdmin && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can view user information. Only administrators can modify user roles and permissions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Booking Approval Component
const BookingApproval: React.FC = () => {
  const { profile } = useAuth();
  
  const { data: bookingStats, isLoading } = useQuery({
    queryKey: ['bookingStats', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      const { data: allBookings, error } = await supabase
        .from('bookings')
        .select('status, created_at')
        .eq('status', 'pending');
        
      if (error) throw error;
      
      return {
        pending: allBookings.length,
        totalToday: allBookings.filter(b => 
          new Date(b.created_at).toDateString() === new Date().toDateString()
        ).length
      };
    },
    enabled: !!profile?.organization_id
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600">
                  {isLoading ? '...' : bookingStats?.pending || 0}
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Requests Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isLoading ? '...' : bookingStats?.totalToday || 0}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Today
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-green-600">2h</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Target
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Booking Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookingList />
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Dashboard Component
const ManagersDashboard: React.FC = () => {
  const { profile } = useAuth();
  
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboardStats', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      // Get car stats
      const { data: cars, error: carsError } = await supabase
        .from('cars')
        .select('status')
        .eq('organization_id', profile.organization_id);
        
      if (carsError) throw carsError;
      
      // Get booking stats for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, created_at')
        .gte('created_at', startOfMonth.toISOString());
        
      if (bookingsError) throw bookingsError;
      
      return {
        totalCars: cars.length,
        availableCars: cars.filter(c => c.status === 'available').length,
        bookedCars: cars.filter(c => c.status === 'booked').length,
        maintenanceCars: cars.filter(c => c.status === 'maintenance').length,
        monthlyBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        activeBookings: bookings.filter(b => b.status === 'in_progress').length,
      };
    },
    enabled: !!profile?.organization_id
  });

  const StatCard = ({ title, value, subtitle, color, icon: Icon }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>
              {isLoading ? '...' : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Fleet"
          value={dashboardStats?.totalCars || 0}
          subtitle="Vehicles in fleet"
          color="text-blue-600"
          icon={Car}
        />
        
        <StatCard
          title="Available"
          value={dashboardStats?.availableCars || 0}
          subtitle="Ready for booking"
          color="text-green-600"
          icon={Car}
        />
        
        <StatCard
          title="Monthly Bookings"
          value={dashboardStats?.monthlyBookings || 0}
          subtitle="This month"
          color="text-purple-600"
          icon={CalendarIcon}
        />
        
        <StatCard
          title="Active Trips"
          value={dashboardStats?.activeBookings || 0}
          subtitle="Currently in progress"
          color="text-amber-600"
          icon={BarChart3}
        />
      </div>

      {/* Fleet Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Available
                </span>
                <span className="font-semibold">{dashboardStats?.availableCars || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Booked
                </span>
                <span className="font-semibold">{dashboardStats?.bookedCars || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Maintenance
                </span>
                <span className="font-semibold">{dashboardStats?.maintenanceCars || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Car className="h-4 w-4 mr-2" />
              Add New Vehicle
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Wrench className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Enhanced Damage List Component
const DamageList: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Damage Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No damage reports found. This is good news! When damage is reported, it will appear here for review and action.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

const FleetManagerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'approvals');
  
  const { user, profile } = useAuth();
  const { canManageFleet } = usePermissions();
  const navigate = useNavigate();
  
  // Check permissions first
  if (!canManageFleet) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access fleet management features. 
            Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/bookings')} className="mt-4">
          Go to Bookings
        </Button>
      </div>
    );
  }
  
  const { data: pendingCount, isLoading: isCountLoading } = useQuery({
    queryKey: ['pendingBookingsCount'],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (error) throw error;
        return count || 0;
      } catch (error) {
        console.error('Error in pendingCount query:', error);
        return 0;
      }
    },
    refetchInterval: 30000,
  });
  
  const scrollToApprovals = () => {
    setActiveTab('approvals');
    setTimeout(() => {
      const element = document.getElementById('approvals-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Manager</h1>
          <p className="text-gray-500 mt-1">
            Manage bookings, vehicles, damage reports, and fleet operations
          </p>
        </div>
        <div className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
          <Shield className="h-4 w-4 mr-1" />
          Fleet Manager Access
        </div>
      </div>
      
      {/* Pending Bookings Alert */}
      {!isCountLoading && pendingCount && pendingCount > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-amber-800">
                You have {pendingCount} pending booking {pendingCount === 1 ? 'request' : 'requests'} that need your approval.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={scrollToApprovals}
            >
              Review Now
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Main Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="damage" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Damage
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="approvals" id="approvals-section">
          <BookingApproval />
        </TabsContent>
        
        <TabsContent value="calendar">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Fleet Calendar</h2>
              <p className="text-gray-500">View all bookings across the entire fleet</p>
            </div>
            <BookingCalendar />
          </div>
        </TabsContent>
        
        <TabsContent value="vehicles">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Vehicle Management</h2>
              <p className="text-gray-500">Add, edit, and manage fleet vehicles</p>
            </div>
            <CarInfoEditor />
          </div>
        </TabsContent>
        
        <TabsContent value="damage">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Damage Reports</h2>
              <p className="text-gray-500">Review and manage vehicle damage reports</p>
            </div>
            <DamageList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FleetManagerPage;