import axios, { AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface LoginResponse {
  success: boolean;
  data: {
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    user: {
      id: string;
      email: string;
    };
  };
}

export interface VerificationQueueItem {
  id: string;
  user_id: string;
  background_check_status: string;
  flagged_records: FlaggedRecord[];
  admin_review_required: boolean;
  background_check_date: string;
  user: {
    email: string;
    phone: string;
    created_at: string;
  };
  payment_status: string;
  sla_hours_remaining: number;
}

export interface FlaggedRecord {
  type: string;
  description: string;
  date?: string;
  location?: string;
  disposition?: string;
}

export interface VerificationDetail {
  verification: {
    id: string;
    user_id: string;
    background_check_status: string;
    id_verification_status: string;
    flagged_records: FlaggedRecord[];
    certn_applicant_id?: string;
    background_check_report_id?: string;
  };
  user: {
    id: string;
    email: string;
    phone: string;
    created_at: string;
    last_login: string;
  };
  payments: any[];
  flagged_records: FlaggedRecord[];
  id_verification_data: any;
}

export interface VerificationStats {
  verifications: {
    total: number;
    fully_verified: number;
    bg_approved: number;
    bg_rejected: number;
    bg_consider: number;
    pending_review: number;
    avg_score: number;
  };
  payments: {
    total_payments: number;
    total_revenue: number;
    total_refunded: number;
    successful_payments: number;
    refund_rate: number;
  };
}

// API functions
export const adminAPI = {
  // Authentication
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Verification Queue
  getQueue: async () => {
    const response = await api.get<{ success: boolean; data: { queue: VerificationQueueItem[]; total: number } }>(
      '/api/admin/verifications/queue'
    );
    return response.data;
  },

  // Verification Details
  getVerification: async (userId: string) => {
    const response = await api.get<{ success: boolean; data: VerificationDetail }>(
      `/api/admin/verifications/${userId}`
    );
    return response.data;
  },

  // Approve Verification
  approve: async (userId: string, notes: string) => {
    const response = await api.post(
      `/api/admin/verifications/${userId}/approve`,
      { notes }
    );
    return response.data;
  },

  // Reject Verification
  reject: async (userId: string, notes: string) => {
    const response = await api.post(
      `/api/admin/verifications/${userId}/reject`,
      { notes }
    );
    return response.data;
  },

  // Statistics
  getStats: async () => {
    const response = await api.get<{ success: boolean; data: VerificationStats }>(
      '/api/admin/verifications/stats/overview'
    );
    return response.data;
  },

  // Search Users
  searchUsers: async (query: string) => {
    const response = await api.get('/api/admin/users/search', {
      params: { query },
    });
    return response.data;
  },
};

export default api;
