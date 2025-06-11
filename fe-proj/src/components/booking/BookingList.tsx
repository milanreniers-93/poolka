// src/components/booking/BookingList.tsx - Fixed version with proper API integration
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Clock, Car, User, MapPin, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  destination?: string;
  passenger_count?: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  cars: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    parking_spot?: string;
  };
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface BookingListProps {
  filter?: 'upcoming' | 'past' | 'all';
}

interface BookingResponse {
  bookings: Booking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const BookingList: React.FC<BookingListProps> = ({ filter = 'all' }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load bookings from backend API
  const loadBookings = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setError(null);
      }

      const params: Record<string, any> = {
        filter,
        page: reset ? 1 : page,
        limit: 20,
      };

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Debug logging
      console.log('🔍 Loading bookings with params:', params);
      console.log('🔍 Current user:', user?.id);
      console.log('🔍 Current profile role:', profile?.role);
      
      // Make API call
      const response: BookingResponse = await api.bookings.getBookings(params);
      
      console.log('✅ API response:', {
        bookingsCount: response.bookings?.length || 0,
        pagination: response.pagination
      });
      
      // Update bookings state
      if (reset) {
        setBookings(response.bookings || []);
      } else {
        setBookings(prev => [...prev, ...(response.bookings || [])]);
      }

      // Update pagination
      if (response.pagination) {
        setHasMore(response.pagination.hasMore);
      } else {
        // Fallback if pagination info not available
        setHasMore((response.bookings || []).length === 20);
      }

      setError(null);
      
    } catch (error: any) {
      console.error('❌ Error loading bookings:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      setError(error.message || 'Failed to load bookings');
      
      // Don't clear bookings on error unless it's the first load
      if (reset) {
        setBookings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load bookings when component mounts or filters change
  useEffect(() => {
    if (user) {
      // Check if we have a profile before loading bookings
      if (!profile && !loading) {
        setError('User profile not found. Please ensure your profile is properly set up.');
        setLoading(false);
        return;
      }
      
      if (profile) {
        loadBookings(true);
      }
    }
  }, [filter, statusFilter, user, profile]);

  // Handle booking approval
  const handleApproveBooking = async (bookingId: string) => {
    try {
      await api.bookings.updateBooking(bookingId, { status: 'confirmed' });
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'confirmed' as const }
          : booking
      ));
      
      console.log('✅ Booking approved:', bookingId);
      
    } catch (error: any) {
      console.error('❌ Error approving booking:', error);
      setError(error.message || 'Failed to approve booking');
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await api.bookings.cancelBooking(bookingId);
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' as const }
          : booking
      ));
      
      console.log('✅ Booking cancelled:', bookingId);
      
    } catch (error: any) {
      console.error('❌ Error cancelling booking:', error);
      setError(error.message || 'Failed to cancel booking');
    }
  };

  // Load more bookings (pagination)
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    loadBookings(false);
  };

  // Get status badge configuration
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      in_progress: { variant: 'default' as const, label: 'In Progress' },
      completed: { variant: 'outline' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Permission checks
  const canApproveBookings = profile && ['admin', 'fleet_manager'].includes(profile.role);
  const canViewAllBookings = profile && ['admin', 'fleet_manager'].includes(profile.role);

  // Filter bookings by search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.reason?.toLowerCase().includes(searchLower) ||
      booking.destination?.toLowerCase().includes(searchLower) ||
      booking.cars?.make?.toLowerCase().includes(searchLower) ||
      booking.cars?.model?.toLowerCase().includes(searchLower) ||
      booking.cars?.license_plate?.toLowerCase().includes(searchLower) ||
      booking.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      booking.profiles?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset page when filter changes
  };

  // Loading state for initial load
  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading bookings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => loadBookings(true)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No bookings match your current filters.'
                  : 'You don\'t have any bookings yet.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => navigate('/bookings/new')}>
                  Create Your First Booking
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Main booking info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.cars?.make} {booking.cars?.model}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {booking.cars?.license_plate}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(new Date(booking.start_time), 'PPP')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(new Date(booking.start_time), 'p')} - {format(new Date(booking.end_time), 'p')}
                        </span>
                      </div>
                      {canViewAllBookings && booking.profiles && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>
                            {booking.profiles.first_name} {booking.profiles.last_name}
                          </span>
                        </div>
                      )}
                      {booking.destination && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{booking.destination}</span>
                        </div>
                      )}
                    </div>

                    {booking.reason && (
                      <div className="text-sm">
                        <span className="font-medium">Reason: </span>
                        <span className="text-gray-600">{booking.reason}</span>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes: </span>
                        <span className="text-gray-600">{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      View Details
                    </Button>
                    
                    {canApproveBookings && booking.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveBooking(booking.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                    )}
                    
                    {booking.status === 'pending' && booking.user_id === user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && filteredBookings.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingList;