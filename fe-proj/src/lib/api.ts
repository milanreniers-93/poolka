// src/lib/api.ts - Centralized API client for backend calls
import { UserRole, ProfileUpdate, OrganizationUpdate, SignUpUserData, SignUpOrganizationData } from '@/contexts/auth/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface BookingParams {
  filter?: 'upcoming' | 'past' | 'all';
  page?: number;
  limit?: number;
  status?: string;
}

interface BookingResponse {
  bookings: any[];
  total: number;
  page: number;
  totalPages: number;
}

interface CarAvailabilityParams {
  startTime: string;
  endTime: string;
  organizationId: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    // Get auth token from Supabase session
    let token: string | null = null;
    try {
      // Try to get token from Supabase
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (error) {
      console.warn('Could not retrieve auth token:', error);
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication endpoints
  auth = {
    signUp: async (userData: SignUpUserData, organizationData: SignUpOrganizationData) => {
      return this.makeRequest<{ user: any; organization: any; profile: any }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ userData, organizationData }),
      });
    },

    signIn: async (email: string, password: string) => {
      return this.makeRequest<{ user: any; session: any }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    signOut: async () => {
      return this.makeRequest<void>('/auth/signout', {
        method: 'POST',
      });
    },

    refreshSession: async () => {
      return this.makeRequest<{ user: any; session: any }>('/auth/refresh', {
        method: 'POST',
      });
    },

    inviteUsers: async (emails: string[], role: UserRole, organizationId: string) => {
      return this.makeRequest<{ invitations: any[] }>('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ emails, role, organizationId }),
      });
    },
  };

  // Profile endpoints
  profile = {
    getProfile: async (userId: string) => {
      return this.makeRequest<any>(`/profile/${userId}`);
    },

    updateProfile: async (userId: string, updates: ProfileUpdate) => {
      return this.makeRequest<any>(`/profile/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    getUserStats: async (userId: string) => {
      return this.makeRequest<any>(`/profile/${userId}/stats`);
    },

    getRecentBookings: async (userId: string, limit = 5) => {
      return this.makeRequest<any[]>(`/profile/${userId}/bookings?limit=${limit}`);
    },
  };

  // Organization endpoints
  organization = {
    getOrganization: async (organizationId: string) => {
      return this.makeRequest<any>(`/organization/${organizationId}`);
    },

    updateOrganization: async (organizationId: string, updates: OrganizationUpdate) => {
      return this.makeRequest<any>(`/organization/${organizationId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    getUsers: async (organizationId: string) => {
      return this.makeRequest<any[]>(`/organization/${organizationId}/users`);
    },

    getUserStats: async (organizationId: string) => {
      return this.makeRequest<any>(`/organization/${organizationId}/stats`);
    },

    updateUserRole: async (organizationId: string, userId: string, role: UserRole) => {
      return this.makeRequest<any>(`/organization/${organizationId}/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },

    deactivateUser: async (organizationId: string, userId: string) => {
      return this.makeRequest<any>(`/organization/${organizationId}/users/${userId}/deactivate`, {
        method: 'PUT',
      });
    },
  };

  // Booking endpoints
  bookings = {
    getBookings: async (params: BookingParams = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
      
      return this.makeRequest<BookingResponse>(`/bookings?${queryParams}`);
    },

    getBooking: async (bookingId: string) => {
      return this.makeRequest<any>(`/bookings/${bookingId}`);
    },

    createBooking: async (bookingData: any) => {
      return this.makeRequest<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
    },

    updateBooking: async (bookingId: string, updates: any) => {
      return this.makeRequest<any>(`/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    cancelBooking: async (bookingId: string) => {
      return this.makeRequest<any>(`/bookings/${bookingId}/cancel`, {
        method: 'PUT',
      });
    },

    approveBooking: async (bookingId: string, notes?: string) => {
      return this.makeRequest<any>(`/bookings/${bookingId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
    },

    getPendingBookings: async (organizationId: string) => {
      return this.makeRequest<any[]>(`/bookings/pending?organizationId=${organizationId}`);
    },

    getBookingStats: async (organizationId: string) => {
      return this.makeRequest<any>(`/bookings/stats?organizationId=${organizationId}`);
    },

    getCalendarBookings: async (organizationId: string, startDate: string, endDate: string) => {
      return this.makeRequest<any[]>(
        `/bookings/calendar?organizationId=${organizationId}&startDate=${startDate}&endDate=${endDate}`
      );
    },
  };

  // Fleet/Cars endpoints
  fleet = {
    getCars: async (organizationId: string) => {
      return this.makeRequest<any[]>(`/fleet/cars?organizationId=${organizationId}`);
    },

    getCar: async (carId: string) => {
      return this.makeRequest<any>(`/fleet/cars/${carId}`);
    },

    createCar: async (carData: any) => {
      return this.makeRequest<any>('/fleet/cars', {
        method: 'POST',
        body: JSON.stringify(carData),
      });
    },

    updateCar: async (carId: string, updates: any) => {
      return this.makeRequest<any>(`/fleet/cars/${carId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    deleteCar: async (carId: string) => {
      return this.makeRequest<void>(`/fleet/cars/${carId}`, {
        method: 'DELETE',
      });
    },

    getAvailableCars: async (params: CarAvailabilityParams) => {
      const queryParams = new URLSearchParams(params);
      return this.makeRequest<any[]>(`/fleet/cars/available?${queryParams}`);
    },

    getFleetStats: async (organizationId: string) => {
      return this.makeRequest<any>(`/fleet/stats?organizationId=${organizationId}`);
    },
  };

  // Analytics endpoints
  analytics = {
    getDashboardStats: async (organizationId: string) => {
      return this.makeRequest<any>(`/analytics/dashboard?organizationId=${organizationId}`);
    },

    getBookingAnalytics: async (organizationId: string, period: 'month' | 'year' = 'month') => {
      return this.makeRequest<any>(`/analytics/bookings?organizationId=${organizationId}&period=${period}`);
    },

    getFleetUtilization: async (organizationId: string, period: 'month' | 'year' = 'month') => {
      return this.makeRequest<any>(`/analytics/fleet-utilization?organizationId=${organizationId}&period=${period}`);
    },

    getUserActivity: async (organizationId: string) => {
      return this.makeRequest<any[]>(`/analytics/user-activity?organizationId=${organizationId}`);
    },
  };

  // Notification endpoints
  notifications = {
    getNotifications: async (userId: string) => {
      return this.makeRequest<any[]>(`/notifications?userId=${userId}`);
    },

    markAsRead: async (notificationId: string) => {
      return this.makeRequest<void>(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
    },

    markAllAsRead: async (userId: string) => {
      return this.makeRequest<void>(`/notifications/mark-all-read`, {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      });
    },
  };
}

// Create and export the API instance
export const api = new ApiClient(API_BASE_URL);

// Export types for use in components
export type { ApiResponse, BookingParams, BookingResponse, CarAvailabilityParams };