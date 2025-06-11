// api.ts
const API_BASE_URL =  import.meta.env.VITE_API_URL ;


// Get auth token from Supabase session
const getAuthToken = () => {
  try {
    // Your app uses custom storage key 'fleet-manager-auth'
    const authData = localStorage.getItem('fleet-flow-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        // Supabase stores session data in different possible structures
        if (parsed.access_token) {
          console.log('Found auth token in fleet-flow-auth (direct)');
          return parsed.access_token;
        }
        if (parsed.session && parsed.session.access_token) {
          console.log('Found auth token in fleet-flow-auth (session)');
          return parsed.session.access_token;
        }
        if (parsed.currentSession && parsed.currentSession.access_token) {
          console.log('Found auth token in fleet-flow-auth (currentSession)');
          return parsed.currentSession.access_token;
        }
        
        console.log('Auth data structure:', parsed);
      } catch (e) {
        console.warn('Error parsing fleet-flow-auth data:', e);
      }
    }
    
    // Fallback: check for standard Supabase keys as backup
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          if (authData && authData.access_token) {
            console.log('Found auth token in standard Supabase key:', key);
            return authData.access_token;
          }
        } catch (e) {
          console.warn('Error parsing auth data from key:', key, e);
        }
      }
    }
    
    console.warn('No auth token found');
    console.log('Available localStorage keys:', Object.keys(localStorage));
    return '';
  } catch (error) {
    console.error('Error getting auth token:', error);
    return '';
  }
};

// Generic API request function
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  console.log('Making API request to:', `${API_BASE_URL}${endpoint}`);
  console.log('Auth token present:', !!token);
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  console.log('Request config:', config);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('API error response:', errorData);
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Booking API functions
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
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/bookings?${queryParams}`);
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

  // Update booking
  updateBooking: async (id: string, updates: any) => {
    return apiRequest(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Cancel booking
  cancelBooking: async (id: string) => {
    return apiRequest(`/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  // Get calendar data
  getCalendarData: async (start: string, end: string) => {
    return apiRequest(`/bookings/calendar/data?start=${start}&end=${end}`);
  },
};

// Car API functions
export const carAPI = {
  getCars: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/cars?${queryParams}`);
  },

  getCar: async (id: string) => {
    return apiRequest(`/cars/${id}`);
  },

  createCar: async (carData: any) => {
    return apiRequest('/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    });
  },

  updateCar: async (id: string, updates: any) => {
    return apiRequest(`/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCar: async (id: string) => {
    return apiRequest(`/cars/${id}`, {
      method: 'DELETE',
    });
  },
};

// Organization API functions
export const organizationAPI = {
  getOrganizations: async () => {
    return apiRequest('/organizations');
  },

  getOrganization: async (id: string) => {
    return apiRequest(`/organizations/${id}`);
  },

  createOrganization: async (orgData: any) => {
    return apiRequest('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  },

  updateOrganization: async (id: string, updates: any) => {
    return apiRequest(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getOrganizationStats: async (id: string) => {
    return apiRequest(`/organizations/${id}/stats`);
  },
};

// Profile API functions
export const profileAPI = {
  getProfile: async (id?: string) => {
    const endpoint = id ? `/profiles/${id}` : '/profiles/me';
    return apiRequest(endpoint);
  },

  updateProfile: async (id: string, updates: any) => {
    return apiRequest(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getProfiles: async (params: {
    page?: number;
    limit?: number;
    organization_id?: string;
    role?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/profiles?${queryParams}`);
  },
};

// Export a general api object for easier importing
export const api = {
  bookings: bookingAPI,
  cars: carAPI,
  organizations: organizationAPI,
  profiles: profileAPI,
};