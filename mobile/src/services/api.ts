/**
 * API Service Configuration
 * Axios instance with authentication and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        const token = await AsyncStorage.getItem('authToken');
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
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
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

  async register(data: {
    email: string;
    password: string;
    phone: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async verifyPhone(phone: string, code: string) {
    const response = await this.client.post('/auth/verify-phone', { phone, code });
    return response.data;
  }

  // User/Parent endpoints
  async getUserProfile() {
    const response = await this.client.get('/parents/profile');
    return response.data;
  }

  async updateProfile(data: Record<string, any>) {
    const response = await this.client.patch('/parents/profile', data);
    return response.data;
  }

  async uploadProfilePhoto(formData: FormData) {
    const response = await this.client.post('/parents/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
}

export default new ApiService();
