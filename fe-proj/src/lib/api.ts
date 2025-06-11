// lib/api.ts - Enhanced API client with proper error handling and types
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Types for API responses
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface Booking {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  destination?: string;
  passenger_count?: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at?: string;
  cars?: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    parking_spot?: string;
  };
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  status: 'available' | 'booked' | 'maintenance' | 'out_of_service' | 'retired';
  color?: string;
  current_mileage?: number;
  daily_rate?: number;
  notes?: string;
  organization_id: string;
  created_at: string;
}

// Enhanced error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Get auth token from localStorage with better error handling
const getAuthToken = (): string | null => {
  try {
    // Get session from Supabase auth storage
    const authData = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.access_token;
    }

    // Fallback: check your custom key
    const customAuth = localStorage.getItem('fleet-flow-auth');
    if (customAuth) {
      const parsed = JSON.parse(customAuth);
      return parsed.access_token || parsed.session?.access_token;
    }

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Generic API request function with proper error handling
export const apiRequest = async <T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: 'Invalid response format' };
    }

    if (!response.ok) {
      throw new ApiError(
        responseData.error || responseData.message || `HTTP ${response.status}`,
        response.status,
        responseData.code,
        responseData.details
      );
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
};

// Booking API functions
export const bookingAPI = {
  // Get all bookings with filters
  getBookings: async (params: {
    filter?: 'upcoming' | 'past' | 'all';
    page?: number;
    limit?: number;
    car_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    user_id?: string;
  } = {}): Promise<{ bookings: Booking[]; pagination?: any }> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/bookings?${queryParams}`);
  },

  // Get booking by ID
  getBooking: async (id: string): Promise<Booking> => {
    return apiRequest(`/bookings/${id}`);
  },

  // Create new booking
  createBooking: async (bookingData: {
    car_id: string;
    start_time: string;
    end_time: string;
    reason?: string;
    destination?: string;
    passenger_count?: number;
    notes?: string;
  }): Promise<{ message: string; booking: Booking }> => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Update booking
  updateBooking: async (id: string, updates: Partial<Booking>): Promise<{ message: string; booking: Booking }> => {
    return apiRequest(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Cancel booking
  cancelBooking: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  // Get calendar data
  getCalendarData: async (start: string, end: string): Promise<{ bookings: Booking[] }> => {
    return apiRequest(`/bookings/calendar/data?start=${start}&end=${end}`);
  },
};

// Car API functions
export const carAPI = {
  getCars: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    available_only?: boolean;
  } = {}): Promise<{ cars: Car[]; pagination?: any }> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/cars?${queryParams}`);
  },

  getCar: async (id: string): Promise<Car> => {
    return apiRequest(`/cars/${id}`);
  },

  createCar: async (carData: Omit<Car, 'id' | 'organization_id' | 'created_at'>): Promise<{ message: string; car: Car }> => {
    return apiRequest('/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    });
  },

  updateCar: async (id: string, updates: Partial<Car>): Promise<{ message: string; car: Car }> => {
    return apiRequest(`/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCar: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/cars/${id}`, {
      method: 'DELETE',
    });
  },

  checkAvailability: async (carId: string, startTime: string, endTime: string): Promise<{
    available: boolean;
    reason?: string;
    conflicts?: any[];
  }> => {
    return apiRequest(`/cars/availability/${carId}?start_time=${startTime}&end_time=${endTime}`);
  },

  getFleetStats: async (): Promise<{
    totalCars: number;
    availableCars: number;
    bookedCars: number;
    maintenanceCars: number;
    monthlyBookings: number;
    completedBookings: number;
    pendingBookings: number;
    activeBookings: number;
  }> => {
    return apiRequest('/cars/stats/overview');
  },
};

// Organization API functions
export const organizationAPI = {
  getMyOrganization: async (): Promise<any> => {
    return apiRequest('/organizations/me');
  },

  updateMyOrganization: async (updates: any): Promise<{ message: string; organization: any }> => {
    return apiRequest('/organizations/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getStats: async (): Promise<any> => {
    return apiRequest('/organizations/stats');
  },

  getPlan: async (): Promise<any> => {
    return apiRequest('/organizations/plan');
  },
};

// Profile API functions
export const profileAPI = {
  getMyProfile: async (): Promise<any> => {
    return apiRequest('/profiles/me');
  },

  updateMyProfile: async (updates: any): Promise<{ message: string; profile: any }> => {
    return apiRequest('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getProfiles: async (params: {
    page?: number;
    limit?: number;
    role?: string;
    active_only?: boolean;
  } = {}): Promise<{ profiles: any[]; pagination?: any }> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/profiles?${queryParams}`);
  },

  getUserStats: async (userId?: string): Promise<any> => {
    const endpoint = userId ? `/profiles/${userId}/stats` : '/profiles/me/stats';
    return apiRequest(endpoint);
  },
};

// Auth API functions
export const authAPI = {
  signUp: async (userData: any): Promise<any> => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  signIn: async (email: string, password: string): Promise<any> => {
    return apiRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signOut: async (): Promise<any> => {
    return apiRequest('/auth/signout', {
      method: 'POST',
    });
  },

  getMe: async (): Promise<any> => {
    return apiRequest('/auth/me');
  },

  refreshSession: async (): Promise<any> => {
    return apiRequest('/auth/session');
  },
};

// Export the main api object
export const api = {
  bookings: bookingAPI,
  cars: carAPI,
  organizations: organizationAPI,
  profiles: profileAPI,
  auth: authAPI,
};

// Export utility functions (ApiError is already exported above)
export { getAuthToken };