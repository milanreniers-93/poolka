import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserProfile } from '@/lib/supabase';
import { Loader2, Users, Shield, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth/AuthContext';

const ManagersDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get current user's organization first
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', currentUser?.id)
        .single();
        
      if (currentUserError) throw currentUserError;
      
      // Fetch all users from the same organization
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', currentUserData.organization_id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setUsers(data as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.id]);

  const handlePromoteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'fleet_manager' })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'User has been promoted to fleet manager',
        variant: 'default',
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote user',
        variant: 'destructive',
      });
    }
  };

  const handleDemoteUser = async (id: string) => {
    // Prevent self-demotion
    if (id === currentUser?.id) {
      toast({
        title: 'Not Allowed',
        description: 'You cannot demote yourself',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'User has been demoted from fleet manager',
        variant: 'default',
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error demoting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to demote user',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string, userId: string) => {
    const isCurrentUser = userId === currentUser?.id;
    
    if (role === 'fleet_manager') {
      return (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <Shield className="h-4 w-4" />
            Fleet Manager
          </span>
          {isCurrentUser && (
            <span className="text-xs text-gray-500">(You)</span>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-gray-600">
          <User className="h-4 w-4" />
          User
        </span>
        {isCurrentUser && (
          <span className="text-xs text-gray-500">(You)</span>
        )}
      </div>
    );
  };

  const getActionButton = (user: UserProfile) => {
    const isCurrentUser = user.id === currentUser?.id;
    
    if (user.role === 'fleet_manager') {
      return (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleDemoteUser(user.id)}
          disabled={isCurrentUser}
          className={isCurrentUser ? "opacity-50 cursor-not-allowed" : ""}
        >
          Demote to User
        </Button>
      );
    }
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handlePromoteUser(user.id)}
        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        Promote to Manager
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Organization Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-fibie-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No users found in your organization.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.first_name} {user.last_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {getRoleBadge(user.role, user.id)}
                  </TableCell>
                  <TableCell>
                    {getActionButton(user)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagersDashboard;