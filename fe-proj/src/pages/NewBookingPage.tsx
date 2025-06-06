// src/pages/NewBookingPage.tsx
import React from 'react';
import BookingForm from '../components/booking/BookingForm';

const NewBookingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
        <p className="text-gray-500 mt-1">
          Create a new booking request for a vehicle
        </p>
      </div>
      
      <BookingForm />
    </div>
  );
};

export default NewBookingPage;