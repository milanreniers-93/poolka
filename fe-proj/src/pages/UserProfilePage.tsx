// src/pages/UserProfilePage.tsx - Migrated to use backend API
import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api'; // ✅ Import API client instead of supabase
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Car,
  Clock,
  Shield,
  Edit,
  Save,
  X,
  CreditCard,
  MapPin,
  Users,
  BarChart3
} from 'lucide-react';

const UserProfilePage = () => {
  const { user, profile, organization, updateProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    license_number: profile?.license_number || '',
    license_expiry: profile?.license_expiry || '',
  });

  const queryClient = useQueryClient();

  // ✅ MIGRATED: Fetch user statistics using backend API
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      console.log('📊 Fetching user stats via backend API for user:', profile.id);
      
      // ✅ Use backend API instead of direct Supabase
      const stats = await api.profile.getUserStats(profile.id);
      
      console.log('✅ User stats received:', {
        totalBookings: stats?.totalBookings,
        completedBookings: stats?.completedBookings,
        monthlyBookings: stats?.monthlyBookings
      });
      
      return stats;
    },
    enabled: !!profile?.id
  });

  // ✅ MIGRATED: Fetch recent bookings using backend API
  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recentBookings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      console.log('📋 Fetching recent bookings via backend API for user:', profile.id);
      
      // ✅ Use backend API instead of direct Supabase
      const bookings = await api.profile.getRecentBookings(profile.id, 5);
      
      console.log('✅ Recent bookings received:', bookings?.length || 0);
      
      return bookings || [];
    },
    enabled: !!profile?.id
  });

  // ✅ MIGRATED: Update profile using backend API
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      if (!profile?.id) {
        throw new Error('No user profile found');
      }
      
      console.log('✏️ Updating profile via backend API:', updates);
      
      // ✅ Use backend API instead of direct Supabase
      await api.profile.updateProfile(profile.id, updates);
      
      console.log('✅ Profile updated successfully');
    },
    onSuccess: () => {
      setIsEditing(false);
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.message?.includes('validation')) {
        errorMessage = 'Please check your profile details and try again';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to update this profile';
      } else if (error.message?.includes('duplicate')) {
        errorMessage = 'Some information already exists in the system';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error updating profile",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSaveProfile = () => {
    // Basic validation
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      toast({
        title: "Validation error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      license_number: profile?.license_number || '',
      license_expiry: profile?.license_expiry || '',
    });
    setIsEditing(false);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Administrator', variant: 'destructive' as const, icon: Shield },
      fleet_manager: { label: 'Fleet Manager', variant: 'default' as const, icon: Car },
      driver: { label: 'Driver', variant: 'secondary' as const, icon: User },
      viewer: { label: 'Viewer', variant: 'outline' as const, icon: User },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      confirmed: { label: 'Confirmed', variant: 'default' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'outline' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-gray-500 mt-1">
            Manage your account settings and view your activity
          </p>
        </div>
        {getRoleBadge(profile.role)}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Bookings
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  ) : (
                    <p className="py-2 px-3 bg-gray-50 rounded-md">{profile.first_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                    />
                  ) : (
                    <p className="py-2 px-3 bg-gray-50 rounded-md">{profile.last_name}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g., +32 xxx xxx xxx"
                    />
                  ) : (
                    <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profile.phone || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="license_number">License Number</Label>
                  {isEditing ? (
                    <Input
                      id="license_number"
                      value={editForm.license_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, license_number: e.target.value }))}
                      placeholder="e.g., ABC123456"
                    />
                  ) : (
                    <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {profile.license_number || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="license_expiry">License Expiry</Label>
                  {isEditing ? (
                    <Input
                      id="license_expiry"
                      type="date"
                      value={editForm.license_expiry}
                      onChange={(e) => setEditForm(prev => ({ ...prev, license_expiry: e.target.value }))}
                    />
                  ) : (
                    <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {profile.license_expiry ? new Date(profile.license_expiry).toLocaleDateString() : 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <div className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                    <div className="inline-flex items-center whitespace-nowrap">
                      {getRoleBadge(profile.role)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Member Since</Label>
                  <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statsLoading ? '...' : userStats?.totalBookings || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statsLoading ? '...' : userStats?.completedBookings || 0}
                    </p>
                  </div>
                  <Car className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {statsLoading ? '...' : userStats?.monthlyBookings || 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {statsLoading ? '...' : userStats?.pendingBookings || 0}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading bookings...</span>
                </div>
              ) : recentBookings && recentBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {booking.car?.make} {booking.car?.model}
                            </p>
                            <p className="text-sm text-gray-500">{booking.car?.license_plate}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(booking.start_time).toLocaleDateString()}</p>
                            <p className="text-gray-500">to {new Date(booking.end_time).toLocaleDateString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(booking.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(booking.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                  <p className="text-gray-500 mb-4">You haven't made any bookings yet.</p>
                  <Button onClick={() => window.location.href = '/bookings/new'}>
                    Create Your First Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organization ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Organization Name</Label>
                      <p className="py-2 px-3 bg-gray-50 rounded-md">{organization.name}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {organization.email}
                      </p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="py-2 px-3 bg-gray-50 rounded-md flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {organization.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>Address</Label>
                    <div className="py-2 px-3 bg-gray-50 rounded-md">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        <div>
                          <p>{organization.address_line_1}</p>
                          {organization.address_line_2 && <p>{organization.address_line_2}</p>}
                          <p>{organization.city}, {organization.state_province} {organization.postal_code}</p>
                          <p>{organization.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {organization.industry && (
                    <div>
                      <Label>Industry</Label>
                      <p className="py-2 px-3 bg-gray-50 rounded-md">{organization.industry}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No organization information available.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfilePage;