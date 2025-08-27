import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  usersApi,
  businessesApi,
  settlementsApi,
  policiesApi,
  contentsApi,
  eventsApi,
  analyticsApi,
  authApi,
} from '../lib/api';
import type {
  UserFilters,
  BusinessFilters,
  SettlementFilters,
  PolicyForm,
  BusinessApprovalForm,
  SettlementProcessForm,
  UserMileageAdjustForm,
} from '../types';

// Query Keys
export const QueryKeys = {
  dashboard: ['dashboard'],
  users: ['users'],
  businesses: ['businesses'],
  settlements: ['settlements'],
  policies: ['policies'],
  contents: ['contents'],
  events: ['events'],
  analytics: ['analytics'],
  auth: ['auth'],
} as const;

// Dashboard Hooks
export const useDashboardStats = () => {
  return useQuery({
    queryKey: QueryKeys.dashboard,
    queryFn: () => dashboardApi.getStats(),
  });
};

// User Management Hooks
export const useUsers = (filters?: UserFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...QueryKeys.users, filters, page, limit],
    queryFn: () => usersApi.getUsers(filters, page, limit),
  });
};

export const useUser = (id: number) => {
  return useQuery({
    queryKey: [...QueryKeys.users, id],
    queryFn: () => usersApi.getUserById(id),
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.users });
    },
  });
};

export const useAdjustMileage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserMileageAdjustForm) => usersApi.adjustMileage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.users });
      queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
    },
  });
};

// Business Management Hooks
export const useBusinesses = (filters?: BusinessFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...QueryKeys.businesses, filters, page, limit],
    queryFn: () => businessesApi.getBusinesses(filters, page, limit),
  });
};

export const useBusiness = (id: number) => {
  return useQuery({
    queryKey: [...QueryKeys.businesses, id],
    queryFn: () => businessesApi.getBusinessById(id),
    enabled: !!id,
  });
};

export const useApproveBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessApprovalForm) => businessesApi.approveOrRejectBusiness(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.businesses });
      queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
    },
  });
};

// Settlement Management Hooks
export const useSettlements = (filters?: SettlementFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...QueryKeys.settlements, filters, page, limit],
    queryFn: () => settlementsApi.getSettlements(filters, page, limit),
  });
};

export const useProcessSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SettlementProcessForm) => settlementsApi.processSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.settlements });
      queryClient.invalidateQueries({ queryKey: QueryKeys.dashboard });
    },
  });
};

// Policy Management Hooks
export const useSettings = () => {
  return useQuery({
    queryKey: QueryKeys.policies,
    queryFn: () => policiesApi.getSettings(),
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: PolicyForm) => policiesApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.policies });
    },
  });
};

// Content Management Hooks
export const useContents = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...QueryKeys.contents, page, limit],
    queryFn: () => contentsApi.getContents(page, limit),
  });
};

export const useCreateContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contentsApi.createContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contents });
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => contentsApi.updateContent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contents });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contentsApi.deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contents });
    },
  });
};

// Event Management Hooks
export const useEvents = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...QueryKeys.events, page, limit],
    queryFn: () => eventsApi.getEvents(page, limit),
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.events });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => eventsApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.events });
    },
  });
};

// Analytics Hooks
export const useUserStats = (period: 'week' | 'month' | 'year') => {
  return useQuery({
    queryKey: [...QueryKeys.analytics, 'users', period],
    queryFn: () => analyticsApi.getUserStats(period),
  });
};

export const useBusinessStats = (period: 'week' | 'month' | 'year') => {
  return useQuery({
    queryKey: [...QueryKeys.analytics, 'businesses', period],
    queryFn: () => analyticsApi.getBusinessStats(period),
  });
};

export const useMileageStats = (period: 'week' | 'month' | 'year') => {
  return useQuery({
    queryKey: [...QueryKeys.analytics, 'mileage', period],
    queryFn: () => analyticsApi.getMileageStats(period),
  });
};

export const useReferralStats = (period: 'week' | 'month' | 'year') => {
  return useQuery({
    queryKey: [...QueryKeys.analytics, 'referrals', period],
    queryFn: () => analyticsApi.getReferralStats(period),
  });
};

// Authentication Hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authApi.login(email, password),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: QueryKeys.auth,
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
  });
};