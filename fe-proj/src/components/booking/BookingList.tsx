// src/components/booking/BookingList.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/auth';
import { usePermissions } from '../auth'; 
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Car, MapPin, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isAfter, isBefore } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  // Joined data
  car?: {
    make: string;
    model: string;
    license_plate: string;
    parking_spot?: string;
  };
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface BookingListProps {
  showAddButton?: boolean;
  filter?: 'current' | 'past' | 'upcoming' | 'all';
  title?: string;
  limit?: number;
  onlyForCurrentUser?: boolean;
}

const BookingList: React.FC<BookingListProps> = ({
  showAddButton = true,
  filter = 'upcoming',
  title = 'My Bookings',
  limit,
  onlyForCurrentUser = true
}) => {
  const { user, profile } = useAuth();
  const { canViewAllBookings } = usePermissions();
  const { toast } = useToast(); // ✅ Added toast hook
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      fetchBookings();
    }
  }, [filter, user, profile]);

  const fetchBookings = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase.from('bookings').select(`
        id,
        user_id,
        car_id,
        start_time,
        end_time,
        reason,
        destination,
        passenger_count,
        status,
        notes,
        approved_by,
        approved_at,
        created_at
      `);
      
      // Apply user filter - only show user's own bookings unless they can view all
      if (onlyForCurrentUser || !canViewAllBookings) {
        query = query.eq('user_id', user.id);
      }
      
      // Apply date filters
      const now = new Date().toISOString();
      if (filter === 'current') {
        query = query.lte('start_time', now).gte('end_time', now);
      } else if (filter === 'upcoming') {
        query = query.gt('start_time', now);
      } else if (filter === 'past') {
        query = query.lt('end_time', now);
      }
      
      // Order by start time
      query = query.order('start_time', { ascending: filter === 'past' ? false : true });
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: bookingsData, error: bookingsError } = await query;
      
      if (bookingsError) throw bookingsError;
      
      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }
      
      // Get car information for each booking
      const carIds = [...new Set(bookingsData.map(b => b.car_id))];
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, make, model, license_plate, parking_spot')
        .in('id', carIds);
      
      if (carsError) {
        console.error('Error fetching car data:', carsError);
      }
      
      // Get user information if viewing all bookings
      let usersData = null;
      if (!onlyForCurrentUser && canViewAllBookings) {
        const userIds = [...new Set(bookingsData.map(b => b.user_id))];
        const { data, error: usersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (usersError) {
          console.error('Error fetching user data:', usersError);
        } else {
          usersData = data;
        }
      }
      
      // Combine booking data with car and user information
      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        car: carsData?.find(car => car.id === booking.car_id),
        user: usersData?.find(user => user.id === booking.user_id)
      }));
      
      setBookings(enrichedBookings);
      
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      in_progress: { variant: 'default', label: 'In Progress' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };
  
  const getStatusColor = (booking: Booking) => {
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (booking.status === 'cancelled') return 'border-red-200 bg-red-50';
    if (booking.status === 'completed') return 'border-gray-200 bg-gray-50';
    if (booking.status === 'in_progress') return 'border-blue-200 bg-blue-50';
    if (isAfter(now, startTime) && isBefore(now, endTime)) return 'border-green-200 bg-green-50';
    if (booking.status === 'confirmed') return 'border-green-200';
    return 'border-yellow-200 bg-yellow-50';
  };

  if (!user || !profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">Please sign in to view bookings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {showAddButton && (
          <Button onClick={() => navigate('/bookings/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Error loading bookings</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchBookings}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {filter === 'upcoming' ? 'No upcoming bookings' : 
               filter === 'past' ? 'No past bookings' :
               filter === 'current' ? 'No current bookings' : 'No bookings found'}
            </p>
            {showAddButton && (
              <Button onClick={() => navigate('/bookings/new')}>
                Create Your First Booking
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-4 border rounded-lg hover:shadow-md cursor-pointer transition-all ${getStatusColor(booking)}`}
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Date and Time */}
                    <div className="flex items-center text-sm font-medium mb-2">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>
                        {format(new Date(booking.start_time), 'PPp')}
                        {' '} → {' '}
                        {format(new Date(booking.end_time), 'PPp')}
                      </span>
                    </div>
                    
                    {/* Car Information */}
                    {booking.car && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Car className="h-4 w-4 mr-2" />
                        <span>
                          {booking.car.make} {booking.car.model} ({booking.car.license_plate})
                        </span>
                        {booking.car.parking_spot && (
                          <span className="ml-2 text-gray-500">
                            • Parked at {booking.car.parking_spot}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Reason */}
                    {booking.reason && (
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>Reason:</strong> {booking.reason}
                      </div>
                    )}
                    
                    {/* Destination */}
                    {booking.destination && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{booking.destination}</span>
                      </div>
                    )}
                    
                    {/* Passenger Count */}
                    {booking.passenger_count && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{booking.passenger_count} passenger{booking.passenger_count > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    
                    {/* User info (for fleet managers viewing all bookings) */}
                    {booking.user && !onlyForCurrentUser && (
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>Booked by:</strong> {booking.user.first_name} {booking.user.last_name}
                      </div>
                    )}
                    
                    {/* Notes */}
                    {booking.notes && (
                      <div className="text-sm text-gray-600 mt-2 italic">
                        "{booking.notes}"
                      </div>
                    )}
                  </div>
                  
                  {/* Status Badge and Actions */}
                  <div className="flex flex-col items-end space-y-2">
                    {getStatusBadge(booking.status)}
                    
                    {/* Action buttons for pending bookings (fleet managers only) */}
                    {booking.status === 'pending' && canViewAllBookings && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveBooking(booking.id);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectBooking(booking.id);
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {/* Approval info */}
                    {booking.approved_at && (
                      <div className="text-xs text-gray-500">
                        Approved {format(new Date(booking.approved_at), 'MMM d')}
                      </div>
                    )}
                    
                    {/* Created date */}
                    <div className="text-xs text-gray-400">
                      Created {format(new Date(booking.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Helper functions for booking actions
  async function handleApproveBooking(bookingId: string) {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Refresh bookings list
      await fetchBookings();
      
      toast({
        title: 'Booking approved',
        description: 'The booking has been confirmed.',
      });
      
    } catch (error: any) {
      console.error('Error approving booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve booking: ' + error.message,
        variant: 'destructive',
      });
    }
  }
  
  async function handleRejectBooking(bookingId: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled'
        })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Refresh bookings list
      await fetchBookings();
      
      toast({
        title: 'Booking rejected',
        description: 'The booking has been cancelled.',
      });
      
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject booking: ' + error.message,
        variant: 'destructive',
      });
    }
  }
};

export default BookingList;