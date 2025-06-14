// src/lib/api.ts - Improved version with better token handling
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Enhanced token retrieval function
const getAuthToken = () => {
  try {
    // First check the specific key your app uses
    const authData = localStorage.getItem('fleet-flow-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        
        // Handle different possible structures
        if (typeof parsed === 'string' && parsed.length > 50) {
          return parsed; // Direct token
        }
        
        if (parsed.access_token) {
          return parsed.access_token;
        }
        
        if (parsed.session?.access_token) {
          return parsed.session.access_token;
        }
        
        if (parsed.currentSession?.access_token) {
          return parsed.currentSession.access_token;
        }
        
        // Check for nested structures
        if (parsed.user && parsed.access_token) {
          return parsed.access_token;
        }
        
      } catch (e) {
        console.warn('Error parsing auth data:', e);
      }
    }
    
    // Fallback: check all Supabase-style keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.access_token) {
            console.log('Found token in fallback key:', key);
            return data.access_token;
          }
        } catch (e) {
          // Continue to next key
        }
      }
    }
    
    console.warn('No auth token found in localStorage');
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Enhanced API request function with better error handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
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
    
    // Handle different response types
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        // Token expired or invalid - could trigger re-auth here
        console.error('Authentication failed - token may be expired');
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    // Handle empty responses
    if (response.status === 204) {
      return {}; // No content
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API Request failed:', {
      endpoint,
      error: error.message,
      token: !!token
    });
    throw error;
  }
};


export const bookingAPI = {
  // Get all bookings with filters
  getBookings: async (params: {
    filter?: string;
    page?: number;
    limit?: number;
    car_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    user_id?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/bookings${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
  },

  // Get booking by ID
  getBooking: async (id: string) => {
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
  }) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Update booking (regular updates only - no status changes)
  updateBooking: async (id: string, updates: {
    start_time?: string;
    end_time?: string;
    reason?: string;
    destination?: string;
    passenger_count?: number;
    notes?: string;
    // Note: status is NOT allowed here - use approve/reject/cancel instead
  }) => {
    return apiRequest(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // NEW: Approve booking (admin/fleet manager only)
  approveBooking: async (id: string) => {
    return apiRequest(`/bookings/${id}/approve`, {
      method: 'POST',
    });
  },

  // NEW: Reject booking (admin/fleet manager only)
  rejectBooking: async (id: string, reason?: string) => {
    return apiRequest(`/bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Cancel booking (user can cancel their own, admin can cancel any)
  cancelBooking: async (id: string) => {
    return apiRequest(`/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  // Get calendar data
  getCalendarData: async (start: string, end: string) => {
    return apiRequest(`/bookings/calendar/data?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  },
};

// Cars API functions
export const carAPI = {
  // Get all cars with filters
  getCars: async (params: {
    status?: string;
    available_only?: boolean;
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/cars${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
  },

  // Get car by ID
  getCar: async (id: string) => {
    return apiRequest(`/cars/${id}`);
  },

  // Create new car (fleet managers only)
  createCar: async (carData: {
    make: string;
    model: string;
    year: number;
    license_plate: string;
    vin?: string;
    seats: number;
    trunk_size?: string;
    fuel_type?: string;
    transmission?: string;
    color?: string;
    parking_spot?: string;
    current_mileage?: number;
    daily_rate?: number;
    notes?: string;
  }) => {
    return apiRequest('/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    });
  },

  // Update car (fleet managers only)
  updateCar: async (id: string, updates: any) => {
    return apiRequest(`/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete car (admins only)
  deleteCar: async (id: string) => {
    return apiRequest(`/cars/${id}`, {
      method: 'DELETE',
    });
  },

  // Check car availability
  checkAvailability: async (carId: string, startTime: string, endTime: string) => {
    return apiRequest(`/cars/availability/${carId}?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`);
  },

  // Assign car to user (fleet managers only)
  assignCar: async (id: string, assignedTo: string | null) => {
    return apiRequest(`/cars/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  },

  // Get fleet statistics (fleet managers only)
  getStats: async () => {
    return apiRequest('/cars/stats/overview');
  },
};

// Organization API functions - Enhanced
export const organizationAPI = {
  getMe: async () => {
    return apiRequest('/organizations/me');
  },

  updateMe: async (updates: any) => {
    return apiRequest('/organizations/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getStats: async () => {
    return apiRequest('/organizations/stats');
  },

  getPlan: async () => {
    return apiRequest('/organizations/plan');
  },

  updatePlan: async (pricingPlanId: string) => {
    return apiRequest('/organizations/plan', {
      method: 'PUT',
      body: JSON.stringify({ pricing_plan_id: pricingPlanId }),
    });
  },

  getBillingHistory: async (params: { page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/organizations/billing-history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
  },
};

// Profile API functions - Enhanced
export const profileAPI = {
  getMe: async () => {
    return apiRequest('/profiles/me');
  },

  updateMe: async (updates: any) => {
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
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/profiles${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
  },

  getProfile: async (id: string) => {
    return apiRequest(`/profiles/${id}`);
  },

  updateProfile: async (id: string, updates: any) => {
    return apiRequest(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getStats: async () => {
    return apiRequest('/profiles/stats/overview');
  },

  getUserBookings: async (id: string, params: { status?: string; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/profiles/${id}/bookings${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiRequest(endpoint);
  },

  getUserStats: async (id: string) => {
    return apiRequest(`/profiles/${id}/stats`);
  },
};

// Auth API functions - New
export const authAPI = {
  signin: async (email: string, password: string) => {
    return apiRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signup: async (userData: any) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  signout: async () => {
    return apiRequest('/auth/signout', {
      method: 'POST',
    });
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },

  getSession: async () => {
    return apiRequest('/auth/session');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Invite API functions
export const inviteAPI = {
  inviteUsers: async (inviteData: {
    emails: string[];
    role: string;
    organization_id: string;
    invited_by: string;
  }) => {
    return apiRequest('/invite-users', {
      method: 'POST',
      body: JSON.stringify(inviteData),
    });
  },
};

// Export organized API object
export const api = {
  auth: authAPI,
  bookings: bookingAPI,
  cars: carAPI,
  organizations: organizationAPI,
  profiles: profileAPI,
  invites: inviteAPI,
};
