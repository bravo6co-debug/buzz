import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Business,
  BusinessSettlement,
  DashboardStats,
  SystemSetting,
  RegionalContent,
  Event,
  MileageTransaction,
  PolicyForm,
  BusinessApprovalForm,
  SettlementProcessForm,
  UserMileageAdjustForm,
  UserFilters,
  BusinessFilters,
  SettlementFilters,
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  // Add session-based authentication if needed
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication errors
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardApi = {
  getStats: (): Promise<ApiResponse<DashboardStats>> =>
    api.get('/admin/dashboard/stats').then(res => res.data),
};

// User Management API
export const usersApi = {
  getUsers: (filters?: UserFilters, page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<User>>> =>
    api.get('/admin/users', { params: { ...filters, page, limit } }).then(res => res.data),
  
  getUserById: (id: number): Promise<ApiResponse<User>> =>
    api.get(`/admin/users/${id}`).then(res => res.data),
  
  updateUser: (id: number, data: Partial<User>): Promise<ApiResponse<User>> =>
    api.put(`/admin/users/${id}`, data).then(res => res.data),
  
  deleteUser: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/admin/users/${id}`).then(res => res.data),
  
  adjustMileage: (data: UserMileageAdjustForm): Promise<ApiResponse<MileageTransaction>> =>
    api.post('/admin/users/adjust-mileage', data).then(res => res.data),
};

// Business Management API
export const businessesApi = {
  getBusinesses: (filters?: BusinessFilters, page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Business>>> =>
    api.get('/admin/businesses', { params: { ...filters, page, limit } }).then(res => res.data),
  
  getBusinessById: (id: number): Promise<ApiResponse<Business>> =>
    api.get(`/admin/businesses/${id}`).then(res => res.data),
  
  approveOrRejectBusiness: (data: BusinessApprovalForm): Promise<ApiResponse<Business>> =>
    api.post('/admin/businesses/approve', data).then(res => res.data),
  
  updateBusiness: (id: number, data: Partial<Business>): Promise<ApiResponse<Business>> =>
    api.put(`/admin/businesses/${id}`, data).then(res => res.data),
};

// Settlement Management API
export const settlementsApi = {
  getSettlements: (filters?: SettlementFilters, page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<BusinessSettlement>>> =>
    api.get('/admin/settlements', { params: { ...filters, page, limit } }).then(res => res.data),
  
  getSettlementById: (id: number): Promise<ApiResponse<BusinessSettlement>> =>
    api.get(`/admin/settlements/${id}`).then(res => res.data),
  
  processSettlement: (data: SettlementProcessForm): Promise<ApiResponse<BusinessSettlement>> =>
    api.post('/admin/settlements/process', data).then(res => res.data),
};

// Policy Management API
export const policiesApi = {
  getSettings: (): Promise<ApiResponse<SystemSetting[]>> =>
    api.get('/admin/settings').then(res => res.data),
  
  updateSettings: (settings: PolicyForm): Promise<ApiResponse<SystemSetting[]>> =>
    api.put('/admin/settings', settings).then(res => res.data),
};

// Content Management API
export const contentsApi = {
  getContents: (page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<RegionalContent>>> =>
    api.get('/admin/contents', { params: { page, limit } }).then(res => res.data),
  
  getContentById: (id: number): Promise<ApiResponse<RegionalContent>> =>
    api.get(`/admin/contents/${id}`).then(res => res.data),
  
  createContent: (data: Omit<RegionalContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<RegionalContent>> =>
    api.post('/admin/contents', data).then(res => res.data),
  
  updateContent: (id: number, data: Partial<RegionalContent>): Promise<ApiResponse<RegionalContent>> =>
    api.put(`/admin/contents/${id}`, data).then(res => res.data),
  
  deleteContent: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/admin/contents/${id}`).then(res => res.data),
};

// Event Management API
export const eventsApi = {
  getEvents: (page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Event>>> =>
    api.get('/admin/events', { params: { page, limit } }).then(res => res.data),
  
  getEventById: (id: number): Promise<ApiResponse<Event>> =>
    api.get(`/admin/events/${id}`).then(res => res.data),
  
  createEvent: (data: Omit<Event, 'id' | 'createdAt'>): Promise<ApiResponse<Event>> =>
    api.post('/admin/events', data).then(res => res.data),
  
  updateEvent: (id: number, data: Partial<Event>): Promise<ApiResponse<Event>> =>
    api.put(`/admin/events/${id}`, data).then(res => res.data),
  
  deleteEvent: (id: number): Promise<ApiResponse<void>> =>
    api.delete(`/admin/events/${id}`).then(res => res.data),
};

// Analytics API
export const analyticsApi = {
  getUserStats: (period: 'week' | 'month' | 'year'): Promise<ApiResponse<any>> =>
    api.get('/admin/analytics/users', { params: { period } }).then(res => res.data),
  
  getBusinessStats: (period: 'week' | 'month' | 'year'): Promise<ApiResponse<any>> =>
    api.get('/admin/analytics/businesses', { params: { period } }).then(res => res.data),
  
  getMileageStats: (period: 'week' | 'month' | 'year'): Promise<ApiResponse<any>> =>
    api.get('/admin/analytics/mileage', { params: { period } }).then(res => res.data),
  
  getReferralStats: (period: 'week' | 'month' | 'year'): Promise<ApiResponse<any>> =>
    api.get('/admin/analytics/referrals', { params: { period } }).then(res => res.data),
  
  generateReport: (type: string, period: string): Promise<ApiResponse<any>> =>
    api.post('/admin/analytics/report', { type, period }).then(res => res.data),
};

// Referral Management API
export const referralApi = {
  getReferrals: (params?: { period?: string; page?: number; limit?: number }): Promise<ApiResponse<any>> =>
    api.get('/admin/referrals', { params }).then(res => res.data),
  
  getReferralSettings: (): Promise<ApiResponse<any>> =>
    api.get('/admin/referrals/settings').then(res => res.data),
  
  updateReferralSettings: (settings: any): Promise<ApiResponse<any>> =>
    api.put('/admin/referrals/settings', settings).then(res => res.data),
  
  adjustReferral: (id: number, data: any): Promise<ApiResponse<any>> =>
    api.post(`/admin/referrals/${id}/adjust`, data).then(res => res.data),
  
  getFraudDetection: (days = 30): Promise<ApiResponse<any>> =>
    api.get('/admin/referrals/fraud-detection', { params: { days } }).then(res => res.data),
};

// Combined Admin API
export const adminApi = {
  ...dashboardApi,
  ...usersApi,
  ...businessesApi,
  ...settlementsApi,
  ...policiesApi,
  ...contentsApi,
  ...eventsApi,
  ...analyticsApi,
  ...referralApi,
};

// Authentication API
export const authApi = {
  login: (email: string, password: string): Promise<ApiResponse<User>> =>
    api.post('/auth/login', { email, password }).then(res => res.data),
  
  logout: (): Promise<ApiResponse<void>> =>
    api.post('/auth/logout').then(res => res.data),
  
  getCurrentUser: (): Promise<ApiResponse<User>> =>
    api.get('/auth/me').then(res => res.data),
};

export { api };