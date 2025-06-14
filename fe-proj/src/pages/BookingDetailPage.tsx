// src/pages/BookingDetailPage.tsx - Updated with new column names
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, User, FileText, AlertTriangle, Car, MapPin, Users, CheckCircle, Clock, ArrowLeft, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  BookingStatus, 
  getBookingStatusConfig, 
  calculateBookingDuration,
  formatBookingTimeRange 
} from '@/constants/bookingStatus';

// Updated interface with new column names
interface Booking {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  destination?: string;
  passenger_count?: number;
  status: BookingStatus;
  notes?: string;
  // Updated column names
  status_changed_by?: string;
  status_changed_at?: string;
  start_mileage?: number;
  end_mileage?: number;
  total_cost?: number;
  created_at: string;
  updated_at?: string;
  cars?: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    parking_spot?: string;
    color?: string;
    seats?: number;
    year?: number;
    fuel_type?: string;
    transmission?: string;
  };
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canApproveBookings = profile && ['admin', 'fleet_manager'].includes(profile.role);
  const canViewAllBookings = profile && ['admin', 'fleet_manager'].includes(profile.role);

  // Set page title
  useEffect(() => {
    document.title = booking 
      ? `Booking Details - ${booking.cars?.make} ${booking.cars?.model}`
      : 'Booking Details';
  }, [booking]);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id || !user || !profile) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching booking details for ID:', id);
        const response = await api.bookings.getBooking(id);
        console.log('✅ Booking data received:', response);
        
        setBooking(response.booking);
        
        // Check if user is allowed to see this booking
        if (response.booking.user_id !== user.id && !canViewAllBookings) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to view this booking',
            variant: 'destructive'
          });
          navigate('/bookings');
          return;
        }
        
      } catch (error: any) {
        console.error('❌ Error fetching booking:', error);
        const errorMessage = error.message || 'Failed to load booking details';
        setError(errorMessage);
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
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
      console.log('🔍 Frontend Debug - Cancelling booking:', booking.id);
      
      const result = await api.bookings.cancelBooking(booking.id);
      
      console.log('✅ Frontend Debug - Booking cancelled successfully:', result);
      
      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled successfully',
        variant: 'default'
      });
      
      // Update local state with new column names
      setBooking(prev => prev ? { 
        ...prev, 
        status: 'cancelled', 
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      } : null);
      
    } catch (error: any) {
      console.error('❌ Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking',
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleApproveBooking = async () => {
    if (!booking) return;
    
    setIsApproving(true);
    try {
      console.log('🔍 Frontend Debug - Approving booking:', booking.id);
      
      const result = await api.bookings.approveBooking(booking.id);
      
      console.log('✅ Frontend Debug - Booking approved successfully:', result);
      
      toast({
        title: 'Booking approved',
        description: 'The booking has been approved successfully',
        variant: 'default'
      });
      
      // Update local state with new column names
      setBooking(prev => prev ? { 
        ...prev, 
        status: 'approved',
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null);
      
    } catch (error: any) {
      console.error('❌ Error approving booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve booking',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!booking) return;
    
    setIsRejecting(true);
    try {
      console.log('🔍 Frontend Debug - Rejecting booking:', booking.id);
      
      const result = await api.bookings.rejectBooking(booking.id, rejectReason);
      
      console.log('✅ Frontend Debug - Booking rejected successfully:', result);
      
      toast({
        title: 'Booking rejected',
        description: 'The booking has been rejected successfully',
        variant: 'default'
      });
      
      // Update local state with new column names
      setBooking(prev => prev ? { 
        ...prev, 
        status: 'rejected',
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null);
      
    } catch (error: any) {
      console.error('❌ Error rejecting booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject booking',
        variant: 'destructive'
      });
    } finally {
      setIsRejecting(false);
      setRejectDialogOpen(false);
      setRejectReason('');
    }
  };

  // Get status badge using centralized configuration
  const getStatusBadge = (status: string) => {
    const config = getBookingStatusConfig(status);
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'EEEE, MMMM d, yyyy') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'HH:mm') : 'Invalid time';
    } catch {
      return 'Invalid time';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'PPp') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to get status change action text
  const getStatusChangeActionText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Status changed';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading booking details...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your booking information</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !booking) {
    return (
      <div className="text-center py-8 max-w-md mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Unable to Load Booking</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Try Again
            </Button>
            <Button onClick={() => navigate('/bookings')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!booking) {
    return (
      <div className="text-center py-8 max-w-md mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/bookings')} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const isPastBooking = new Date(booking.end_time) < new Date();
  const canCancel = !isPastBooking && !['cancelled', 'completed', 'rejected'].includes(booking.status);
  const canApprove = booking.status === 'pending' && canApproveBookings;
  const canReject = booking.status === 'pending' && canApproveBookings;
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
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
          {(booking.status === 'pending' || booking.status === 'approved') && 
           (isOwnBooking || canApproveBookings) && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/bookings/${booking.id}/edit`)}
            >
              Edit Booking
            </Button>
          )}
        </div>
      </div>
      
      {/* Status Alerts */}
      {booking.status === 'cancelled' && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            This booking has been cancelled.
          </AlertDescription>
        </Alert>
      )}

      {booking.status === 'rejected' && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            This booking has been rejected by a fleet manager.
          </AlertDescription>
        </Alert>
      )}

      {booking.status === 'pending' && isOwnBooking && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your booking is pending approval from a fleet manager.
          </AlertDescription>
        </Alert>
      )}

      {booking.status === 'approved' && isOwnBooking && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your booking has been approved! You can proceed with your trip.
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
          {booking.cars && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-3">
                <Car className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Vehicle Details</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-800 font-medium text-lg">
                      {booking.cars.make} {booking.cars.model}
                      {booking.cars.year && ` (${booking.cars.year})`}
                    </p>
                    <p className="text-blue-700 text-sm">License: {booking.cars.license_plate}</p>
                  </div>
                  {booking.cars.color && (
                    <Badge variant="outline" className="bg-white">
                      {booking.cars.color}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {booking.cars.parking_spot && (
                    <p className="text-blue-700 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Parked at: {booking.cars.parking_spot}
                    </p>
                  )}
                  {booking.cars.seats && (
                    <p className="text-blue-700 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {booking.cars.seats} seats
                    </p>
                  )}
                  {booking.cars.fuel_type && (
                    <p className="text-blue-700">
                      Fuel: {booking.cars.fuel_type}
                    </p>
                  )}
                  {booking.cars.transmission && (
                    <p className="text-blue-700">
                      Transmission: {booking.cars.transmission}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time and Duration Summary */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule & Duration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="font-medium">{formatDate(booking.start_time)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p className="font-medium">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  {format(new Date(booking.start_time), 'yyyy-MM-dd') !== format(new Date(booking.end_time), 'yyyy-MM-dd') && (
                    <span className="text-blue-600 ml-2 text-sm">(Multi-day)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="font-medium text-blue-600">
                  {calculateBookingDuration(booking.start_time, booking.end_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Booked by</p>
                  <p className="font-medium">
                    {booking.profiles 
                      ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
                      : isOwnBooking 
                        ? `${profile?.first_name} ${profile?.last_name}`
                        : 'Unknown User'
                    }
                  </p>
                  {booking.profiles && (
                    <>
                      <p className="text-sm text-gray-500">{booking.profiles.email}</p>
                      {booking.profiles.phone && (
                        <p className="text-sm text-gray-500">{booking.profiles.phone}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Created Date */}
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(booking.created_at)}
                  </p>
                  {booking.updated_at && booking.updated_at !== booking.created_at && (
                    <p className="text-xs text-gray-500">
                      Updated: {formatDateTime(booking.updated_at)}
                    </p>
                  )}
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

              {/* Cost */}
              {booking.total_cost && (
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <span className="text-green-600 text-xs font-bold">€</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Cost</p>
                    <p className="font-medium text-green-600">€{booking.total_cost.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Notes */}
          {booking.notes && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Additional Notes
              </p>
              <p className="text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Mileage Information */}
          {(booking.start_mileage || booking.end_mileage) && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="font-medium mb-2">Mileage Information</p>
              <div className="grid grid-cols-2 gap-4">
                {booking.start_mileage && (
                  <div>
                    <p className="text-sm text-gray-500">Start Mileage</p>
                    <p className="font-medium">{booking.start_mileage.toLocaleString()} km</p>
                  </div>
                )}
                {booking.end_mileage && (
                  <div>
                    <p className="text-sm text-gray-500">End Mileage</p>
                    <p className="font-medium">{booking.end_mileage.toLocaleString()} km</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Change Information - Updated with new column names */}
          {booking.status_changed_at && booking.status_changed_by && (
            <div className={`p-4 rounded-lg border ${
              booking.status === 'approved' 
                ? 'bg-green-50 border-green-200' 
                : booking.status === 'cancelled'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`flex items-center gap-2 ${
                booking.status === 'approved' ? 'text-green-800' : 
                booking.status === 'cancelled' ? 'text-orange-800' :
                'text-red-800'
              }`}>
                {booking.status === 'approved' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : booking.status === 'cancelled' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <strong>
                  {getStatusChangeActionText(booking.status)}
                </strong> on {formatDateTime(booking.status_changed_at)}
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Action Buttons */}
        {(canCancel || canApprove || canReject) && (
          <CardFooter className="flex justify-end space-x-2 border-t pt-6">
            {canApprove && (
              <Button
                onClick={handleApproveBooking}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Booking
                  </>
                )}
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isRejecting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Booking
              </Button>
            )}
            {canCancel && (isOwnBooking || canApproveBookings) && (
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
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
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancel Booking
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            {booking && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Booking:</strong> {booking.cars?.make} {booking.cars?.model} on {formatDate(booking.start_time)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancel Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Booking
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-gray-700">
              Are you sure you want to reject this booking? This action cannot be undone.
            </p>
            {booking && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Booking:</strong> {booking.cars?.make} {booking.cars?.model} on {formatDate(booking.start_time)}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectBooking}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetailPage;