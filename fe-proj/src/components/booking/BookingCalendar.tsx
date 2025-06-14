// src/components/booking/BookingCalendar.tsx - Updated Version
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { api } from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight, Car, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CalendarBooking {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  destination?: string;
  // Updated status enum to match database
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  car?: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  car: any;
  user: any;
  reason?: string;
  destination?: string;
  isOwn: boolean;
}

const BookingCalendar: React.FC = () => {
  const { user, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Permission checks
  const canViewAllBookings = profile && ['admin', 'fleet_manager'].includes(profile.role);

  const fetchBookings = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    setError(null);
    
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    
    try {
      console.log('🔍 Calendar Debug - Fetching bookings for:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        canViewAll: canViewAllBookings
      });

      // Use the new API endpoint for calendar data
      const response = await api.bookings.getCalendarData(
        startDate.toISOString(),
        endDate.toISOString()
      );

      console.log('✅ Calendar Debug - API response:', response);

      if (response && response.events) {
        // Transform calendar events to booking format for compatibility
        const transformedBookings: CalendarBooking[] = response.events.map((event: CalendarEvent) => ({
          id: event.id,
          user_id: event.user?.id || '',
          car_id: event.car?.id || '',
          start_time: event.start,
          end_time: event.end,
          reason: event.reason,
          destination: event.destination,
          status: event.status as CalendarBooking['status'],
          car: event.car,
          user: event.user
        }));

        setBookings(transformedBookings);
      } else {
        setBookings([]);
      }
      
    } catch (error: any) {
      console.error('❌ Calendar Error:', error);
      setError(error.message || 'Failed to load calendar data');
      setBookings([]);
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

  const getBookingStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        label: 'Pending'
      },
      approved: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        label: 'Approved'
      },
      rejected: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        label: 'Rejected'
      },
      completed: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: CheckCircle,
        label: 'Completed'
      },
      cancelled: { 
        color: 'bg-gray-100 text-gray-600 border-gray-200', 
        icon: XCircle,
        label: 'Cancelled'
      }
    };
    
    return configs[status as keyof typeof configs] || configs.pending;
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
                  {dayBookings.slice(0, 3).map((booking) => {
                    const statusConfig = getBookingStatusConfig(booking.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${statusConfig.color}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${booking.id}`);
                        }}
                        title={`${booking.reason || 'Booking'} - ${booking.car?.make} ${booking.car?.model} (${statusConfig.label})`}
                      >
                        <div className="flex items-center space-x-1">
                          <StatusIcon className="h-3 w-3 flex-shrink-0" />
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
                    );
                  })}
                  
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
      <div className="flex items-center justify-end space-x-4 mt-4 text-sm flex-wrap">
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-yellow-100 border border-yellow-200 mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-green-100 border border-green-200 mr-2"></div>
          <span>Approved</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-red-100 border border-red-200 mr-2"></div>
          <span>Rejected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-gray-100 border border-gray-200 mr-2"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-3 rounded bg-gray-100 border border-gray-300 mr-2"></div>
          <span>Cancelled</span>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (bookings.length === 0) return null;

    const stats = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(stats).map(([status, count]) => {
          const config = getBookingStatusConfig(status);
          const Icon = config.icon;
          
          return (
            <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Icon className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium capitalize">{config.label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
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
          {renderStats()}
          <div className="overflow-x-auto">
            {renderDaysOfWeek()}
            {renderCalendarCells()}
          </div>
          {renderLegend()}
          
          {/* Calendar Actions */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500">
              {canViewAllBookings ? 'Showing all bookings' : 'Showing your bookings'}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/bookings')}
              >
                View List
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/bookings/new')}
              >
                New Booking
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default BookingCalendar;