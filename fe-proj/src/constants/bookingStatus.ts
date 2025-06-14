// src/constants/bookingStatus.ts - Centralized status configuration

import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

// Valid booking status enum - MUST match your database enum exactly
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

// Status configuration with colors, labels, and icons
export const BOOKING_STATUS_CONFIG = {
  pending: {
    variant: 'secondary' as const,
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Awaiting approval'
  },
  approved: {
    variant: 'default' as const,
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Approved and confirmed'
  },
  rejected: {
    variant: 'destructive' as const,
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Request was rejected'
  },
  completed: {
    variant: 'outline' as const,
    label: 'Completed',
    icon: CheckCircle,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Trip completed successfully'
  },
  cancelled: {
    variant: 'destructive' as const,
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    description: 'Booking was cancelled'
  }
} as const;

// Helper function to get status configuration
export const getBookingStatusConfig = (status: string) => {
  return BOOKING_STATUS_CONFIG[status as BookingStatus] || BOOKING_STATUS_CONFIG.pending;
};

// Status transition rules
export const BOOKING_STATUS_TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [], // Cannot transition from rejected
  completed: [], // Cannot transition from completed
  cancelled: [] // Cannot transition from cancelled
} as const;

// Check if status transition is allowed
export const canTransitionStatus = (fromStatus: BookingStatus, toStatus: BookingStatus): boolean => {
  return BOOKING_STATUS_TRANSITIONS[fromStatus].includes(toStatus as any);
};

// All valid status values for filters, forms, etc.
export const ALL_BOOKING_STATUSES: BookingStatus[] = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

// Duration calculation helper
export const calculateBookingDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  const minutes = Math.round((totalHours - Math.floor(totalHours)) * 60);
  
  if (days > 0) {
    return `${days}d${hours > 0 ? ` ${hours}h` : ''}${minutes > 0 && hours === 0 ? ` ${minutes}m` : ''}`;
  } else if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  } else {
    return `${minutes}m`;
  }
};

// Date formatting helper
export const formatBookingTimeRange = (startTime: string, endTime: string): {
  date: string;
  timeRange: string;
  duration: string;
  isMultiDay: boolean;
} => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const isMultiDay = start.toDateString() !== end.toDateString();
  
  return {
    date: start.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    timeRange: isMultiDay 
      ? `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    duration: calculateBookingDuration(startTime, endTime),
    isMultiDay
  };
};