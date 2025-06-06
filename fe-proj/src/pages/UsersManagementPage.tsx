// src/pages/UsersManagementPage.tsx - Fleet Manager user management
import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { usePermissions } from '@/components/auth/RoleBasedAccess';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Users,
  UserPlus,
  Settings,
  BarChart3,
  Shield,
  User,
  Eye,
  Car,
  Calendar,
  TrendingUp,
  AlertCircle,
  Mail,
  Phone,
  Clock,
  Edit,
  Trash2,
  Crown,
  UserMinus
} from 'lucide-react';
import type { UserRole } from '@/contexts/auth/types';
import InviteUsersDialog from '@/components/admin/InviteUsersDialog';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  organization_id: string;
}

interface UserStats {
  userId: string;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  activeBookings: number;
  monthlyBookings: number;
  lastBookingDate?: string;
}

const UsersManagementPage = () => {
  const { profile } = useAuth();
  const { canManageUsers, isAdmin } = usePermissions();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const queryClient = useQueryClient();

  // Check permissions
  if (!canManageUsers) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage users. Only administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch all users in organization
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['organizationUsers', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!profile?.organization_id
  });

  // Fetch user statistics
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id || !users) return [];
      
      const statsPromises = users.map(async (user) => {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('status, created_at')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching bookings for user:', user.id, error);
          return {
            userId: user.id,
            totalBookings: 0,
            completedBookings: 0,
            pendingBookings: 0,
            activeBookings: 0,
            monthlyBookings: 0,
          };
        }

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sortedBookings = bookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
          userId: user.id,
          totalBookings: bookings.length,
          completedBookings: bookings.filter(b => b.status === 'completed').length,
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
          activeBookings: bookings.filter(b => b.status === 'in_progress').length,
          monthlyBookings: bookings.filter(b => new Date(b.created_at) >= thisMonth).length,
          lastBookingDate: sortedBookings.length > 0 ? sortedBookings[0].created_at : undefined,
        };
      });

      const results = await Promise.all(statsPromises);
      return results as UserStats[];
    },
    enabled: !!profile?.organization_id && !!users
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
      setIsPromoteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User role updated",
        description: "The user's role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user role",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
      toast({
        title: "User deactivated",
        description: "The user has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deactivating user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { label: 'Administrator', variant: 'destructive' as const, icon: Crown },
      fleet_manager: { label: 'Fleet Manager', variant: 'default' as const, icon: Shield },
      driver: { label: 'Driver', variant: 'secondary' as const, icon: Car },
      viewer: { label: 'Viewer', variant: 'outline' as const, icon: Eye },
    };
    
    const config = roleConfig[role] || roleConfig.viewer;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUserStats = (userId: string): UserStats | undefined => {
    return userStats?.find(stat => stat.userId === userId);
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  }) || [];

  const organizationStats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter(u => u.is_active).length || 0,
    adminCount: users?.filter(u => u.role === 'admin').length || 0,
    fleetManagerCount: users?.filter(u => u.role === 'fleet_manager').length || 0,
    driverCount: users?.filter(u => u.role === 'driver').length || 0,
    viewerCount: users?.filter(u => u.role === 'viewer').length || 0,
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1">
            Manage user roles, permissions, and monitor usage statistics
          </p>
        </div>
        <div className="inline-flex items-center bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm">
          <Shield className="h-4 w-4 mr-1" />
          Admin Access
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({organizationStats.totalUsers})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Role Management
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="min-w-[200px]">
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Administrators</SelectItem>
                      <SelectItem value="fleet_manager">Fleet Managers</SelectItem>
                      <SelectItem value="driver">Drivers</SelectItem>
                      <SelectItem value="viewer">Viewers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row justify-end">
                {isAdmin && <InviteUsersDialog />}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const stats = getUserStats(user.id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center whitespace-nowrap">
                            {getRoleBadge(user.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Total: {stats?.totalBookings || 0}</div>
                            <div className="text-gray-500">This month: {stats?.monthlyBookings || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.last_login ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(user.last_login).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-500">Never</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {isAdmin && user.id !== profile?.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsPromoteDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.is_active && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to deactivate ${user.first_name} ${user.last_name}?`)) {
                                        deactivateUserMutation.mutate(user.id);
                                      }
                                    }}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-600">{organizationStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-green-600">{organizationStats.activeUsers}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fleet Managers</p>
                    <p className="text-2xl font-bold text-purple-600">{organizationStats.fleetManagerCount}</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Drivers</p>
                    <p className="text-2xl font-bold text-amber-600">{organizationStats.driverCount}</p>
                  </div>
                  <Car className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Role Management Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Hierarchy & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="font-semibold">Administrator</h3>
                      <p className="text-sm text-gray-500">Full system access, user management, all permissions</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Highest</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Fleet Manager</h3>
                      <p className="text-sm text-gray-500">Fleet management, booking approvals, vehicle management</p>
                    </div>
                  </div>
                  <Badge variant="default">High</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Driver</h3>
                      <p className="text-sm text-gray-500">Create bookings, manage own reservations</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Medium</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Eye className="h-8 w-8 text-gray-600" />
                    <div>
                      <h3 className="font-semibold">Viewer</h3>
                      <p className="text-sm text-gray-500">Read-only access to bookings and fleet information</p>
                    </div>
                  </div>
                  <Badge variant="outline">Lowest</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Change Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">User:</p>
                <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Current Role:</p>
                {getRoleBadge(selectedUser.role)}
              </div>
              
              <div>
                <Label htmlFor="new-role">New Role</Label>
                <Select 
                  defaultValue={selectedUser.role}
                  onValueChange={(value: UserRole) => {
                    if (confirm(`Are you sure you want to change ${selectedUser.first_name}'s role to ${value}?`)) {
                      updateUserRoleMutation.mutate({ 
                        userId: selectedUser.id, 
                        newRole: value 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Changing a user's role will immediately affect their permissions and access to features.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagementPage;