/**
 * API Service Configuration
 * Axios instance with authentication and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import tokenStorage from './tokenStorage';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await tokenStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - attempt refresh or logout
          await tokenStorage.clearTokens();
          // Dispatch logout action or navigate to login
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: { email: string; password: string; phone: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async verifyPhone(phone: string, code: string) {
    const response = await this.client.post('/auth/verify-phone', { phone, code });
    return response.data;
  }

  // Profile endpoints - matches backend /api/profiles routes
  async getUserProfile() {
    const response = await this.client.get('/profiles/me');
    return response.data;
  }

  async createProfile(data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    city: string;
    state: string;
    zip_code: string;
    bio?: string;
    occupation?: string;
    budget_min?: number;
    budget_max?: number;
    number_of_children?: number;
    ages_of_children?: string;
    schedule_type?: 'flexible' | 'fixed' | 'shift_work';
    work_from_home?: boolean;
  }) {
    const response = await this.client.post('/profiles', data);
    return response.data;
  }

  async updateProfile(data: Record<string, unknown>) {
    const response = await this.client.put('/profiles/me', data);
    return response.data;
  }

  async uploadProfilePhoto(formData: FormData) {
    const response = await this.client.post('/profiles/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // Extended timeout for file uploads
    });
    return response.data;
  }

  async deleteProfile() {
    const response = await this.client.delete('/profiles/me');
    return response.data;
  }

  async searchProfiles(filters: {
    city?: string;
    state?: string;
    budgetMin?: number;
    budgetMax?: number;
    verified?: boolean;
  }) {
    const response = await this.client.get('/profiles/search', { params: filters });
    return response.data;
  }

  // Matches endpoints
  async getMatches(page = 1, limit = 20) {
    const response = await this.client.get('/matches', {
      params: { page, limit },
    });
    return response.data;
  }

  async likeParent(parentId: string) {
    const response = await this.client.post(`/matches/${parentId}/like`);
    return response.data;
  }

  async skipParent(parentId: string) {
    const response = await this.client.post(`/matches/${parentId}/skip`);
    return response.data;
  }

  // Messages endpoints
  async getConversations() {
    const response = await this.client.get('/messages/conversations');
    return response.data;
  }

  async getMessages(conversationId: string) {
    const response = await this.client.get(`/messages/${conversationId}`);
    return response.data;
  }

  async sendMessage(conversationId: string, text: string) {
    const response = await this.client.post(`/messages/${conversationId}`, {
      text,
    });
    return response.data;
  }

  // Verification endpoints
  async requestBackgroundCheck() {
    const response = await this.client.post('/verification/background-check');
    return response.data;
  }

  async uploadID(formData: FormData) {
    const response = await this.client.post('/verification/id', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Household endpoints
  async getHousehold() {
    const response = await this.client.get('/household');
    return response.data;
  }

  async updateHousehold(data: Record<string, any>) {
    const response = await this.client.patch('/household', data);
    return response.data;
  }

  // Moderation endpoints
  async getModerationStatus() {
    const response = await this.client.get('/profile/moderation-status');
    return response.data;
  }

  async checkSuspension() {
    const response = await this.client.get('/auth/check-suspension');
    return response.data;
  }
}

export default new ApiService();
