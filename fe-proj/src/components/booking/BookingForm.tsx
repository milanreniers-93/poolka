// src/components/booking/BookingForm.tsx - Fixed without database functions
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth'; 
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, addHours, addDays, isBefore } from 'date-fns';
import { Loader2, Car, Users, MapPin } from 'lucide-react';

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  status: 'available' | 'booked' | 'maintenance' | 'out_of_service' | 'retired';
  current_mileage?: number;
  parking_spot?: string;
}

const BookingForm: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [startDateTime, setStartDateTime] = useState<string>(
    format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    format(addHours(addDays(new Date(), 1), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Smart date handling - update end date when start date changes
  const handleStartDateTimeChange = (newStartDateTime: string) => {
    setStartDateTime(newStartDateTime);
    
    // If new start time is after current end time, adjust end time
    const newStartDate = new Date(newStartDateTime);
    const currentEndDate = new Date(endDateTime);
    
    if (newStartDate >= currentEndDate) {
      // Set end time to 2 hours after start time (minimum booking duration)
      const newEndDate = addHours(newStartDate, 2);
      const newEndDateTime = format(newEndDate, "yyyy-MM-dd'T'HH:mm");
      setEndDateTime(newEndDateTime);
      
      console.log('📅 Auto-adjusted end time:', newEndDateTime);
      toast({
        title: 'End time adjusted',
        description: 'End time has been automatically set to 2 hours after start time.',
        duration: 3000,
      });
      
      // Check availability with new dates after a short delay to ensure state updates
      setTimeout(() => {
        if (profile?.organization_id) {
          checkAvailableCarsWithDates(newStartDateTime, newEndDateTime);
        }
      }, 100);
    } else {
      // Check availability with current end date
      setTimeout(() => {
        if (profile?.organization_id) {
          checkAvailableCarsWithDates(newStartDateTime, endDateTime);
        }
      }, 100);
    }
  };

  // Validate end date when it changes
  const handleEndDateTimeChange = (newEndDateTime: string) => {
    const newEndDate = new Date(newEndDateTime);
    const currentStartDate = new Date(startDateTime);
    
    if (newEndDate <= currentStartDate) {
      toast({
        title: 'Invalid end time',
        description: 'End time must be after start time',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }
    
    setEndDateTime(newEndDateTime);
    
    // Check availability with new end date
    setTimeout(() => {
      if (profile?.organization_id) {
        checkAvailableCarsWithDates(startDateTime, newEndDateTime);
      }
    }, 100);
  };

  // Enhanced function to check available cars with specific dates
  const checkAvailableCarsWithDates = async (startDateTimeStr?: string, endDateTimeStr?: string) => {
    const start = startDateTimeStr || startDateTime;
    const end = endDateTimeStr || endDateTime;
    
    if (!start || !end || !profile?.organization_id) return;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Validate dates
    if (isBefore(endDate, startDate)) {
      toast({
        title: 'Invalid dates',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }
    
    if (isBefore(startDate, new Date())) {
      toast({
        title: 'Invalid start time',
        description: 'Start time cannot be in the past',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCheckingAvailability(true);
    setAvailableCars([]);
    setSelectedCarId('');
    
    try {
      console.log('🔍 Checking available cars for:', {
        organization: profile.organization_id,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });
      
      // Step 1: Get all available cars in the organization
      const { data: allCars, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'available')
        .order('make, model');
      
      if (carsError) {
        console.error('❌ Error fetching cars:', carsError);
        throw carsError;
      }
      
      console.log('✅ Available cars found:', allCars?.length || 0);
      
      if (!allCars || allCars.length === 0) {
        console.log('⚠️ No cars available in organization');
        setAvailableCars([]);
        return;
      }
      
      // Step 2: Check for booking conflicts
      const { data: conflictingBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('car_id')
        .in('status', ['confirmed', 'in_progress', 'pending'])
        .or(`and(start_time.lte.${endDate.toISOString()},end_time.gte.${startDate.toISOString()})`);
      
      if (bookingsError) {
        console.error('❌ Error checking booking conflicts:', bookingsError);
        throw bookingsError;
      }
      
      console.log('📅 Conflicting bookings found:', conflictingBookings?.length || 0);
      
      // Step 3: Filter out cars with conflicts
      const conflictedCarIds = new Set(conflictingBookings?.map(b => b.car_id) || []);
      const availableCars = allCars.filter(car => !conflictedCarIds.has(car.id));
      
      console.log('✅ Cars available after conflict check:', availableCars.length);
      
      setAvailableCars(availableCars);
      
      if (availableCars.length > 0) {
        setSelectedCarId(availableCars[0].id);
        console.log('🚗 Auto-selected car:', availableCars[0].make, availableCars[0].model);
      } else {
        console.log('⚠️ No cars available after conflict check');
      }
      
    } catch (error) {
      console.error('💥 Error checking car availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to check car availability. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const checkAvailableCars = () => checkAvailableCarsWithDates();

  const checkBookingConflict = async (carId: string, startTime: string, endTime: string): Promise<boolean> => {
    try {
      const { data: conflicts, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('car_id', carId)
        .in('status', ['confirmed', 'in_progress', 'pending'])
        .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);
      
      if (error) {
        console.error('Error checking booking conflict:', error);
        return false; // Assume no conflict if we can't check
      }
      
      return (conflicts?.length || 0) > 0;
    } catch (error) {
      console.error('Error in conflict check:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to create a booking',
        variant: 'destructive',
      });
      return;
    }
    
    // Validation
    if (!startDateTime || !endDateTime) {
      toast({
        title: 'Missing information',
        description: 'Please select start and end times',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedCarId) {
      toast({
        title: 'No car selected',
        description: 'Please select an available car',
        variant: 'destructive',
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a reason for the booking',
        variant: 'destructive',
      });
      return;
    }
    
    if (passengerCount < 1 || passengerCount > 50) {
      toast({
        title: 'Invalid passenger count',
        description: 'Passenger count must be between 1 and 50',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Final availability check before creating booking
      const hasConflict = await checkBookingConflict(
        selectedCarId,
        new Date(startDateTime).toISOString(),
        new Date(endDateTime).toISOString()
      );
      
      if (hasConflict) {
        toast({
          title: 'Booking conflict',
          description: 'This car is no longer available for the selected time',
          variant: 'destructive',
        });
        await checkAvailableCars(); // Refresh available cars
        return;
      }
      
      // Create the booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            car_id: selectedCarId,
            start_time: new Date(startDateTime).toISOString(),
            end_time: new Date(endDateTime).toISOString(),
            reason: reason.trim(),
            destination: destination.trim() || null,
            passenger_count: passengerCount,
            notes: notes.trim() || null,
            status: 'pending'
          }
        ])
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
      }
      
      console.log('✅ Booking created successfully:', data.id);
      
      toast({
        title: 'Booking created',
        description: 'Your booking request has been submitted and is pending approval.',
      });
      
      // Navigate to the booking details page
      navigate(`/bookings/${data.id}`);
      
    } catch (error: any) {
      console.error('💥 Error creating booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Booking</CardTitle>
        {profile?.organization_id && (
          <p className="text-sm text-gray-500">Organization: {profile.organization_id}</p>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-datetime">Start Date & Time *</Label>
              <Input
                id="start-datetime"
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => handleStartDateTimeChange(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-datetime">End Date & Time *</Label>
              <Input
                id="end-datetime"
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => handleEndDateTimeChange(e.target.value)}
                min={startDateTime}
                required
              />
            </div>
          </div>

          {/* Available Cars */}
          <div className="space-y-2">
            <Label htmlFor="car-selection">Available Cars</Label>
            {isCheckingAvailability ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking availability...
              </div>
            ) : availableCars.length === 0 ? (
              <div className="p-4 border rounded-md bg-yellow-50">
                <p className="text-yellow-800 mb-2">
                  No cars available for the selected time period.
                </p>
                <p className="text-sm text-yellow-700">
                  • Make sure your organization has cars marked as "available"<br/>
                  • Try selecting different dates/times<br/>
                  • Check if cars are already booked during this period
                </p>
              </div>
            ) : (
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a car" />
                </SelectTrigger>
                <SelectContent>
                  {availableCars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4" />
                        <span>
                          {car.make} {car.model} ({car.license_plate})
                        </span>
                        <span className="text-sm text-gray-500">
                          • {car.seats} seats • {car.transmission}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500">
              {availableCars.length} car{availableCars.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                placeholder="e.g., Client meeting, business trip"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Downtown office, Airport"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger-count">Number of Passengers *</Label>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Input
                id="passenger-count"
                type="number"
                min="1"
                max="50"
                value={passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                className="w-24"
                required
              />
              <span className="text-sm text-gray-500">passengers</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/bookings')}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || availableCars.length === 0 || !selectedCarId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingForm;