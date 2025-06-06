// src/pages/BookingsPage.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingList from '../components/booking/BookingList';
import BookingCalendar from '../components/booking/BookingCalendar';

const BookingsPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-gray-500 mt-1">
          Manage and view your vehicle bookings
        </p>
      </div>
      
      <Tabs defaultValue="list" onValueChange={(v) => setView(v as 'list' | 'calendar')}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          
          {view === 'list' && (
            <div className="flex space-x-1">
              <TabsList>
                <TabsTrigger 
                  value="upcoming" 
                  onClick={() => setFilter('upcoming')}
                  data-state={filter === 'upcoming' ? 'active' : ''}
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger 
                  value="past" 
                  onClick={() => setFilter('past')}
                  data-state={filter === 'past' ? 'active' : ''}
                >
                  Past
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  onClick={() => setFilter('all')}
                  data-state={filter === 'all' ? 'active' : ''}
                >
                  All
                </TabsTrigger>
              </TabsList>
            </div>
          )}
        </div>
        
        <TabsContent value="list" className="mt-6">
          <BookingList filter={filter} />
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <BookingCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookingsPage;