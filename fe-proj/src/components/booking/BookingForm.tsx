// src/components/booking/BookingForm.tsx - Updated to use Backend API
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, addHours, addDays, isBefore } from 'date-fns';
import { Loader2, Car, Users, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react';

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
  organization_id: string;
}

interface BookingFormProps {
  editingBooking?: {
    id: string;
    car_id: string;
    start_time: string;
    end_time: string;
    reason?: string;
    destination?: string;
    passenger_count?: number;
    notes?: string;
  };
}

const BookingForm: React.FC<BookingFormProps> = ({ editingBooking }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const isEditing = !!editingBooking;
  
  // Form state - Initialize with editing data if available
  const [startDateTime, setStartDateTime] = useState<string>(
    editingBooking?.start_time 
      ? format(new Date(editingBooking.start_time), "yyyy-MM-dd'T'HH:mm")
      : format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    editingBooking?.end_time
      ? format(new Date(editingBooking.end_time), "yyyy-MM-dd'T'HH:mm")
      : format(addHours(addDays(new Date(), 1), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [reason, setReason] = useState(editingBooking?.reason || '');
  const [destination, setDestination] = useState(editingBooking?.destination || '');
  const [passengerCount, setPassengerCount] = useState<number>(editingBooking?.passenger_count || 1);
  const [notes, setNotes] = useState(editingBooking?.notes || '');
  const [selectedCarId, setSelectedCarId] = useState<string>(editingBooking?.car_id || '');
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [allCars, setAllCars] = useState<Car[]>([]);

  // Fetch all cars in the organization
  const fetchAllCars = async () => {
    if (!profile?.organization_id) return;
    
    try {
      console.log('🔍 Fetching all cars for organization:', profile.organization_id);
      
      // You'll need to add this endpoint to your backend
      const response = await api.cars.getCars({
        available_only: true  // This matches your cars route parameter
      });
      
      console.log('✅ Cars fetched:', response.cars?.length || 0);
      setAllCars(response.cars || []);
      
    } catch (error: any) {
      console.error('❌ Error fetching cars:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available cars',
        variant: 'destructive',
      });
    }
  };

  // Check car availability for specific dates
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
    
    try {
      console.log('🔍 Checking car availability for:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        editingId: editingBooking?.id
      });
      
      // Get conflicting bookings - only check approved bookings
      const conflictResponse = await api.bookings.getBookings({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'approved' // Only check approved bookings for conflicts
      });
      
      console.log('📅 Potential conflicts found:', conflictResponse.bookings?.length || 0);
      
      // Filter out cars that have conflicts (excluding current booking if editing)
      const conflictedCarIds = new Set(
        conflictResponse.bookings
          ?.filter(booking => 
            // Exclude current booking if editing
            !editingBooking || booking.id !== editingBooking.id
          )
          ?.map(booking => booking.car_id) || []
      );
      
      const availableCars = allCars.filter(car => !conflictedCarIds.has(car.id));
      
      console.log('✅ Available cars after conflict check:', availableCars.length);
      
      setAvailableCars(availableCars);
      
      // Auto-select first available car if none selected, or preserve selection if editing
      if (availableCars.length > 0) {
        if (!selectedCarId || !availableCars.find(car => car.id === selectedCarId)) {
          setSelectedCarId(availableCars[0].id);
          console.log('🚗 Auto-selected car:', availableCars[0].make, availableCars[0].model);
        }
      } else {
        setSelectedCarId('');
        console.log('⚠️ No cars available for selected time period');
      }
      
    } catch (error: any) {
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
      
      // Check availability with new dates
      setTimeout(() => {
        checkAvailableCarsWithDates(newStartDateTime, newEndDateTime);
      }, 100);
    } else {
      // Check availability with current end date
      setTimeout(() => {
        checkAvailableCarsWithDates(newStartDateTime, endDateTime);
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
      checkAvailableCarsWithDates(startDateTime, newEndDateTime);
    }, 100);
  };

  // Initialize form
  useEffect(() => {
    if (profile?.organization_id) {
      fetchAllCars();
    }
  }, [profile?.organization_id]);

  // Check availability when cars are loaded
  useEffect(() => {
    if (allCars.length > 0 && startDateTime && endDateTime) {
      checkAvailableCarsWithDates();
    }
  }, [allCars, startDateTime, endDateTime]);

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
      const bookingData = {
        car_id: selectedCarId,
        start_time: new Date(startDateTime).toISOString(),
        end_time: new Date(endDateTime).toISOString(),
        reason: reason.trim(),
        destination: destination.trim() || undefined,
        passenger_count: passengerCount,
        notes: notes.trim() || undefined,
      };

      console.log('📝 Submitting booking:', bookingData);
      
      let result;
      if (isEditing) {
        // Update existing booking
        result = await api.bookings.updateBooking(editingBooking.id, bookingData);
        console.log('✅ Booking updated successfully:', editingBooking.id);
        
        toast({
          title: 'Booking updated',
          description: 'Your booking has been updated successfully.',
        });
      } else {
        // Create new booking
        result = await api.bookings.createBooking(bookingData);
        console.log('✅ Booking created successfully:', result.booking?.id);
        
        toast({
          title: 'Booking created',
          description: 'Your booking request has been submitted and is pending approval.',
        });
      }
      
      // Navigate to the booking details page
      const bookingId = isEditing ? editingBooking.id : result.booking?.id;
      if (bookingId) {
        navigate(`/bookings/${bookingId}`);
      } else {
        navigate('/bookings');
      }
      
    } catch (error: any) {
      console.error('💥 Error submitting booking:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} booking`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedCarInfo = () => {
    if (!selectedCarId) return null;
    return availableCars.find(car => car.id === selectedCarId) || 
           allCars.find(car => car.id === selectedCarId);
  };

  const selectedCar = getSelectedCarInfo();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEditing ? 'Edit Booking' : 'Create New Booking'}
        </CardTitle>
        {profile?.organization_id && (
          <p className="text-sm text-gray-500">
            Booking for your organization
          </p>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-datetime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Date & Time *
              </Label>
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
              <Label htmlFor="end-datetime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Date & Time *
              </Label>
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

          {/* Duration Display */}
          {startDateTime && endDateTime && (() => {
            const start = new Date(startDateTime);
            const end = new Date(endDateTime);
            const diffMs = end.getTime() - start.getTime();
            const totalHours = diffMs / (1000 * 60 * 60);
            
            const days = Math.floor(totalHours / 24);
            const hours = Math.floor(totalHours % 24);
            const minutes = Math.round((totalHours - Math.floor(totalHours)) * 60);
            
            let durationText = '';
            
            if (days > 0) {
              durationText += `${days} day${days !== 1 ? 's' : ''}`;
              if (hours > 0) {
                durationText += ` ${hours} hour${hours !== 1 ? 's' : ''}`;
              }
              if (minutes > 0 && hours === 0) {
                durationText += ` ${minutes} min`;
              }
            } else if (hours > 0) {
              durationText = `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
            } else {
              durationText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
            
            return (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Duration:</strong> {durationText}
                </p>
              </div>
            );
          })()}

          {/* Available Cars */}
          <div className="space-y-2">
            <Label htmlFor="car-selection" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Available Cars
            </Label>
            {isCheckingAvailability ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking availability...
              </div>
            ) : availableCars.length === 0 ? (
              <div className="p-4 border rounded-md bg-yellow-50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium mb-2">
                      No cars available for the selected time period.
                    </p>
                    <p className="text-sm text-yellow-700">
                      • Try selecting different dates/times<br/>
                      • Check if cars are already booked during this period<br/>
                      • Contact your fleet manager if you need assistance
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                            {car.make} {car.model} ({car.year})
                          </span>
                          <span className="text-sm text-gray-500">
                            • {car.license_plate} • {car.seats} seats
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Selected Car Details */}
                {selectedCar && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">
                        {selectedCar.make} {selectedCar.model} ({selectedCar.year})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>License: {selectedCar.license_plate}</div>
                      <div>Seats: {selectedCar.seats}</div>
                      <div>Fuel: {selectedCar.fuel_type}</div>
                      <div>Transmission: {selectedCar.transmission}</div>
                      {selectedCar.parking_spot && (
                        <div>Parking: {selectedCar.parking_spot}</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-gray-500">
              {availableCars.length} car{availableCars.length !== 1 ? 's' : ''} available for selected time
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
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination
              </Label>
              <Input
                id="destination"
                placeholder="e.g., Downtown office, Airport"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger-count" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Number of Passengers *
            </Label>
            <div className="flex items-center space-x-2">
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
              <span className="text-sm text-gray-500">
                passengers {selectedCar && `(max ${selectedCar.seats})`}
              </span>
            </div>
            {selectedCar && passengerCount > selectedCar.seats && (
              <p className="text-sm text-red-600">
                Warning: This exceeds the car's seating capacity of {selectedCar.seats}
              </p>
            )}
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(isEditing ? `/bookings/${editingBooking.id}` : '/bookings')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || availableCars.length === 0 || !selectedCarId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {isEditing ? 'Update Booking' : 'Create Booking'}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingForm;