// src/pages/BookingDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/auth/AuthContext'; // ✅ Fixed import path
import { usePermissions } from '../components/auth/RoleBasedAccess'; // ✅ Added permissions
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, User, FileText, AlertTriangle, Car, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
}

interface Car {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  parking_spot?: string;
}

interface BookingUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { canViewAllBookings, canApproveBookings } = usePermissions(); // ✅ Use permissions
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [bookingUser, setBookingUser] = useState<BookingUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id || !user || !profile) return;
      
      setIsLoading(true);
      try {
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();
          
        if (bookingError) throw bookingError;
        
        setBooking(bookingData);
        
        // Check if user is allowed to see this booking
        if (bookingData.user_id !== user.id && !canViewAllBookings) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to view this booking',
            variant: 'destructive'
          });
          navigate('/bookings');
          return;
        }

        // Fetch car information
        const { data: carData, error: carError } = await supabase
          .from('cars')
          .select('id, make, model, license_plate, parking_spot')
          .eq('id', bookingData.car_id)
          .single();
        
        if (carError) {
          console.warn('Could not fetch car data:', carError);
        } else {
          setCar(carData);
        }

        // Fetch user information (if viewing someone else's booking)
        if (bookingData.user_id !== user.id && canViewAllBookings) {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', bookingData.user_id)
            .single();
          
          if (userError) {
            console.warn('Could not fetch user data:', userError);
          } else {
            setBookingUser(userData);
          }
        }
        
      } catch (error: any) {
        console.error('Error fetching booking:', error);
        toast({
          title: 'Error',
          description: 'Failed to load booking details',
          variant: 'destructive'
        });
        navigate('/bookings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookingDetails();
  }, [id, user, profile, canViewAllBookings, navigate, toast]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setIsCancelling(true);
    try {
      // ✅ Update status instead of deleting
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
        
      if (error) throw error;
      
      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled successfully'
      });
      
      // Update local state
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleApproveBooking = async () => {
    if (!booking || !user) return;
    
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', booking.id);
        
      if (error) throw error;
      
      toast({
        title: 'Booking approved',
        description: 'The booking has been confirmed'
      });
      
      // Update local state
      setBooking(prev => prev ? {
        ...prev,
        status: 'confirmed',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      } : null);
      
    } catch (error: any) {
      console.error('Error approving booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve booking: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary', label: 'Pending Approval' },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading booking details...</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800">Booking Not Found</h2>
        <p className="text-gray-600 mt-2">The booking you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/bookings')} className="mt-4">
          Back to Bookings
        </Button>
      </div>
    );
  }

  const isPastBooking = new Date(booking.end_time) < new Date();
  const canCancel = !isPastBooking && booking.status !== 'cancelled' && booking.status !== 'completed';
  const canApprove = booking.status === 'pending' && canApproveBookings;
  const isOwnBooking = booking.user_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Details</h1>
          <p className="text-gray-500 mt-1">
            {isOwnBooking ? 'View and manage your booking' : 'View booking details'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/bookings')}
          >
            Back to Bookings
          </Button>
        </div>
      </div>
      
      {/* Status Alert */}
      {booking.status === 'cancelled' && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            This booking has been cancelled.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Booking Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Booking Information</span>
            </CardTitle>
            {getStatusBadge(booking.status)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Car Information */}
          {car && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Car className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Vehicle Details</h3>
              </div>
              <div className="space-y-1">
                <p className="text-blue-800">
                  <strong>{car.make} {car.model}</strong> ({car.license_plate})
                </p>
                {car.parking_spot && (
                  <p className="text-blue-700 text-sm">
                    Parked at: {car.parking_spot}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Booking Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Booked by</p>
                  <p className="font-medium">
                    {bookingUser 
                      ? `${bookingUser.first_name} ${bookingUser.last_name}`
                      : isOwnBooking 
                        ? `${profile?.first_name} ${profile?.last_name}`
                        : 'Unknown User'
                    }
                  </p>
                  {bookingUser && (
                    <p className="text-sm text-gray-500">{bookingUser.email}</p>
                  )}
                </div>
              </div>
              
              {/* Date & Time */}
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(booking.start_time), 'PPP')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(booking.start_time), 'p')} - {format(new Date(booking.end_time), 'p')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Reason */}
              {booking.reason && (
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reason</p>
                    <p className="font-medium">{booking.reason}</p>
                  </div>
                </div>
              )}
              
              {/* Destination */}
              {booking.destination && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Destination</p>
                    <p className="font-medium">{booking.destination}</p>
                  </div>
                </div>
              )}

              {/* Passenger Count */}
              {booking.passenger_count && (
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Passengers</p>
                    <p className="font-medium">
                      {booking.passenger_count} passenger{booking.passenger_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Notes */}
          {booking.notes && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="font-medium mb-2">Additional Notes</p>
              <p className="text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Approval Info */}
          {booking.approved_at && booking.approved_by && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800">
                <strong>Approved</strong> on {format(new Date(booking.approved_at), 'PPp')}
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Action Buttons */}
        {(canCancel || canApprove) && (
          <CardFooter className="flex justify-end space-x-2 border-t pt-6">
            {canApprove && (
              <Button
                onClick={handleApproveBooking}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? 'Approving...' : 'Approve Booking'}
              </Button>
            )}
            {canCancel && isOwnBooking && (
              <Button
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel Booking
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
      
      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div>
            <p>Are you sure you want to cancel this booking? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetailPage;