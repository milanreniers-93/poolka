import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth/AuthContext';
import { Booking } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const BookingApproval: React.FC = () => {
  const { profile, loading: authLoading } = useAuth(); // Get current user profile
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'confirm' | 'decline' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPendingBookings = async () => {
    if (!profile?.organization_id) {
      console.error('No organization ID found for current user');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Fetching pending bookings for organization:', profile.organization_id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          cars!inner (
            id,
            car_id,
            make,
            model,
            license_plate,
            year,
            organization_id
          )
        `)
        .eq('cars.organization_id', profile.organization_id) // Filter by car's organization
        .eq('status', 'pending') // Only pending bookings requiring approval
        .order('created_at', { ascending: false }); // Most recent first
        
      if (error) {
        console.error('❌ Error fetching pending bookings:', error);
        throw error;
      }
      
      console.log('✅ Pending bookings fetched:', {
        total: data?.length || 0,
        bookings: data?.map(b => ({
          id: b.id,
          user: b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : 'Unknown',
          vehicle: b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : 'No vehicle',
          startTime: b.start_time,
          reason: b.reason
        }))
      });
      
      // Transform the data to match our expected Booking interface format
      const formattedBookings = data?.map((booking: any) => ({
        ...booking,
        user_name: booking.profiles 
          ? `${booking.profiles.first_name} ${booking.profiles.last_name}` 
          : 'Unknown User',
        user_email: booking.profiles?.email || 'No email',
        user_role: booking.profiles?.role || 'driver',
        vehicle_info: booking.cars 
          ? `${booking.cars.make} ${booking.cars.model} (${booking.cars.license_plate})`
          : 'No car assigned',
      })) || [];
      
      setBookings(formattedBookings);
    } catch (error) {
      console.error('❌ Error fetching pending bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending booking requests. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to load and profile to be available
    if (!authLoading && profile?.organization_id) {
      fetchPendingBookings();
    } else if (!authLoading && !profile?.organization_id) {
      console.warn('⚠️ User has no organization_id, cannot fetch bookings');
      setIsLoading(false);
    }
  }, [profile?.organization_id, authLoading]);

  const handleAction = (booking: Booking, action: 'confirm' | 'decline') => {
    setSelectedBooking(booking);
    setActionType(action);
    setActionNotes('');
    setActionDialogOpen(true);
  };

  const submitAction = async () => {
    if (!selectedBooking || !actionType) return;
    
    setIsSubmitting(true);
    
    try {
      console.log(`📝 ${actionType === 'confirm' ? 'Confirming' : 'Declining'} booking:`, selectedBooking.id);
      
      const newStatus = actionType === 'confirm' ? 'approved' : 'rejected';
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add notes if provided
      if (actionNotes.trim()) {
        updateData.admin_notes = actionNotes.trim();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', selectedBooking.id);
        
      if (error) {
        console.error('❌ Error updating booking:', error);
        throw error;
      }
      
      console.log('✅ Booking updated successfully');
      
      toast({
        title: actionType === 'confirm' ? 'Booking Approved' : 'Booking Rejected',
        description: `The booking request from ${selectedBooking.user_name} has been ${actionType === 'confirm' ? 'approved' : 'rejected'} successfully.`,
      });
      
      setActionDialogOpen(false);
      
      // Refresh the bookings list
      await fetchPendingBookings();
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the booking request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if no organization
  if (!profile?.organization_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">⚠️ No Organization Found</p>
            <p className="text-gray-500 text-sm">
              You need to be associated with an organization to manage bookings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Pending Booking Approvals
          {!isLoading && bookings.length > 0 && (
            <Badge variant="secondary">{bookings.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading pending bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No pending booking requests</p>
            <p className="text-gray-400 text-sm">
              All booking requests have been processed or no new requests have been submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="p-6 border rounded-lg hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* User Info */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">{booking.user_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {booking.user_role}
                      </Badge>
                      <span className="text-sm text-gray-500">({booking.user_email})</span>
                    </div>

                    {/* Car Info */}
                    {booking.vehicle_info && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Car:</span>
                        <span>{booking.vehicle_info}</span>
                      </div>
                    )}

                    {/* Time Period */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-600">From:</span>
                        <span className="text-gray-900">
                          {format(new Date(booking.start_time), 'PPP p')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-600">To:</span>
                        <span className="text-gray-900">
                          {format(new Date(booking.end_time), 'PPP p')}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    {booking.reason && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Reason:</span>
                          <Badge variant="secondary" className="ml-2">{booking.reason}</Badge>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <span className="font-medium text-sm text-gray-600">Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{booking.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:w-32">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                      onClick={() => handleAction(booking, 'decline')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAction(booking, 'confirm')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          {selectedBooking && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {actionType === 'confirm' ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                  {actionType === 'confirm' ? 'Approve Booking' : 'Reject Booking'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Requested by:</span>
                    <span>{selectedBooking.user_name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Period:</span> {format(new Date(selectedBooking.start_time), 'PPP p')} to {format(new Date(selectedBooking.end_time), 'PPP p')}
                  </div>
                  {selectedBooking.reason && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Reason:</span> {selectedBooking.reason}
                    </div>
                  )}
                  {selectedBooking.vehicle_info && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Car:</span> {selectedBooking.vehicle_info}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    {actionType === 'confirm' ? 'Approval Notes (Optional)' : 'Rejection Reason (Optional)'}
                  </Label>
                  <Textarea
                    id="notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      actionType === 'confirm' 
                        ? "Add any notes about this approval..." 
                        : "Explain why this booking is being rejected..."
                    }
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={actionType === 'confirm' ? 'default' : 'destructive'}
                  onClick={submitAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : actionType === 'confirm' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve Booking
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject Booking
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BookingApproval;