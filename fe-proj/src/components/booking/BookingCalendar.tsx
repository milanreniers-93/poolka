// src/components/booking/BookingCalendar.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../contexts/auth';
import { usePermissions } from '../auth'; 
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  destination?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  car?: {
    make: string;
    model: string;
    license_plate: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
}

const BookingCalendar: React.FC = () => {
  const { user, profile } = useAuth();
  const { canViewAllBookings } = usePermissions();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    setError(null);
    
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    
    try {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          car_id,
          start_time,
          end_time,
          reason,
          destination,
          status
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .neq('status', 'cancelled') // ✅ Fixed: use 'cancelled' instead of 'declined'
        .order('start_time', { ascending: true });
      
      // Apply user filter based on permissions
      if (!canViewAllBookings) {
        query = query.eq('user_id', user.id);
      }
      
      const { data: bookingsData, error: bookingsError } = await query;
      
      if (bookingsError) throw bookingsError;
      
      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }
      
      // Get car information
      const carIds = [...new Set(bookingsData.map(b => b.car_id))];
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, make, model, license_plate')
        .in('id', carIds);
      
      if (carsError) {
        console.warn('Error fetching car data:', carsError);
      }
      
      // Get user information if viewing all bookings
      let usersData = null;
      if (canViewAllBookings) {
        const userIds = [...new Set(bookingsData.map(b => b.user_id))];
        const { data, error: usersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        if (usersError) {
          console.warn('Error fetching user data:', usersError);
        } else {
          usersData = data;
        }
      }
      
      // Combine data
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

  useEffect(() => {
    if (user && profile) {
      fetchBookings();
    }
  }, [currentMonth, user, profile]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <h2 className="text-xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="flex items-center"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <div className="grid grid-cols-7 border-b">
        {days.map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-50">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const getBookingsForDate = (date: Date) => {
    const targetDate = format(date, 'yyyy-MM-dd');
    
    return bookings.filter(booking => {
      const bookingStartDate = format(new Date(booking.start_time), 'yyyy-MM-dd');
      const bookingEndDate = format(new Date(booking.end_time), 'yyyy-MM-dd');
      
      // Check if the booking spans this date
      return bookingStartDate <= targetDate && bookingEndDate >= targetDate;
    });
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const renderCalendarCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const rows = [];
    
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      
      rows.push(
        <div key={i} className="grid grid-cols-7">
          {week.map((day) => {
            const dayBookings = getBookingsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toString()}
                className={`min-h-[120px] p-2 border-r border-b relative ${
                  !isCurrentMonth
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-white text-gray-900'
                } ${isToday ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
              >
                {/* Date number */}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-blue-600 text-white rounded-full px-1">
                      Today
                    </span>
                  )}
                </div>
                
                {/* Bookings */}
                <div className="space-y-1 overflow-hidden">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getBookingStatusColor(booking.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bookings/${booking.id}`);
                      }}
                      title={`${booking.reason || 'Booking'} - ${booking.car?.make} ${booking.car?.model}`}
                    >
                      <div className="flex items-center space-x-1">
                        <Car className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {format(new Date(booking.start_time), 'HH:mm')}
                          {booking.car && ` - ${booking.car.make}`}
                        </span>
                      </div>
                      {booking.reason && (
                        <div className="truncate mt-0.5 opacity-75">
                          {booking.reason}
                        </div>
                      )}
                      {canViewAllBookings && booking.user && (
                        <div className="truncate text-xs opacity-75">
                          {booking.user.first_name} {booking.user.last_name}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    return <div className="bg-white border">{rows}</div>;
  };

  const renderLegend = () => {
    return (
      <div className="flex items-center justify-end space-x-4 mt-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-green-100 border border-green-200 mr-2"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-yellow-100 border border-yellow-200 mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-blue-100 border border-blue-200 mr-2"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-gray-100 border border-gray-200 mr-2"></div>
          <span>Completed</span>
        </div>
      </div>
    );
  };

  if (!user || !profile) {
    return (
      <Card className="w-full p-6">
        <div className="text-center">
          <p className="text-gray-500">Please sign in to view the booking calendar</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full p-6">
      {renderHeader()}
      
      {error ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading calendar</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button variant="outline" onClick={fetchBookings}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading calendar...</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            {renderDaysOfWeek()}
            {renderCalendarCells()}
          </div>
          {renderLegend()}
        </>
      )}
    </Card>
  );
};

export default BookingCalendar;