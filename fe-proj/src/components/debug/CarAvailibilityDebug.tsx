// src/components/debug/CarAvailabilityDebug.tsx - Debug component to check car availability
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CarAvailabilityDebug: React.FC = () => {
  const { profile } = useAuth();

  const { data: cars, isLoading, error } = useQuery({
    queryKey: ['debugCars', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      console.log('🔍 Debug: Fetching cars for organization:', profile.organization_id);
      
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (error) {
        console.error('❌ Debug: Error fetching cars:', error);
        throw error;
      }
      
      console.log('✅ Debug: Cars found:', data);
      return data;
    },
    enabled: !!profile?.organization_id
  });

  const { data: bookings } = useQuery({
    queryKey: ['debugBookings', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*');

      if (error) {
        console.error('❌ Debug: Error fetching bookings:', error);
        return [];
      }
      
      console.log('📅 Debug: Bookings found:', data);
      return data;
    },
    enabled: !!profile?.organization_id
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading debug info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading debug info: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const availableCars = cars?.filter(car => car.status === 'available') || [];
  const bookedCars = cars?.filter(car => car.status === 'booked') || [];
  const maintenanceCars = cars?.filter(car => car.status === 'maintenance') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Car Availability Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Total Cars</p>
            <p className="text-xl font-bold">{cars?.length || 0}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-green-600">Available</p>
            <p className="text-xl font-bold text-green-800">{availableCars.length}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Booked</p>
            <p className="text-xl font-bold text-blue-800">{bookedCars.length}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-red-600">Maintenance</p>
            <p className="text-xl font-bold text-red-800">{maintenanceCars.length}</p>
          </div>
        </div>

        {/* Car List */}
        <div>
          <h4 className="font-medium mb-2">All Cars:</h4>
          {cars?.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No cars found in your organization. Add cars in Fleet Manager → Vehicles tab.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {cars?.map((car) => (
                <div key={car.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{car.make} {car.model} ({car.year})</p>
                    <p className="text-sm text-gray-500">
                      License: {car.license_plate} | Organization: {car.organization_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      car.status === 'available' ? 'default' :
                      car.status === 'booked' ? 'secondary' :
                      car.status === 'maintenance' ? 'destructive' : 'outline'
                    }>
                      {car.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Info */}
        <div>
          <h4 className="font-medium mb-2">Recent Bookings:</h4>
          {bookings?.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings found.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookings?.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm">Car ID: {booking.car_id}</p>
                    <p className="text-xs text-gray-500">{booking.start_time} to {booking.end_time}</p>
                  </div>
                  <Badge variant="outline">{booking.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Debug Info:</strong><br />
            Organization ID: {profile?.organization_id}<br />
            Available for booking: {availableCars.length} cars<br />
            {availableCars.length === 0 && cars?.length > 0 && 
              "⚠️ You have cars but none are 'available' status!"
            }
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default CarAvailabilityDebug;