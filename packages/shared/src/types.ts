import { z } from 'zod';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserType = z.infer<typeof UserSchema>;

// Business types
export const BusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BusinessType = z.infer<typeof BusinessSchema>;

// Product types
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  isAvailable: z.boolean(),
  businessId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProductType = z.infer<typeof ProductSchema>;

// Order types
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const OrderSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(OrderStatus),
  totalPrice: z.number().int().positive(),
  userId: z.string(),
  businessId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrderType = z.infer<typeof OrderSchema>;

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'BUSINESS' | 'ADMIN';
}