const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface QRVerificationResult {
  valid: boolean;
  type?: 'coupon' | 'mileage';
  tokenId?: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  coupon?: {
    id: number;
    couponType: string;
    discountType: string;
    discountValue: number;
    expiresAt: string;
  };
  balance?: number;
  reason?: string;
}

interface MileageUseRequest {
  userId: number;
  amount: number;
  businessId: number;
  description?: string;
}

interface CouponUseRequest {
  tokenId: number;
  businessId: number;
  orderAmount?: number;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // QR Code verification for mileage
  async verifyMileageQR(qrData: string): Promise<ApiResponse<QRVerificationResult>> {
    return this.request('/api/mileage/verify-qr', {
      method: 'POST',
      body: JSON.stringify({ qrData }),
    });
  }

  // QR Code verification (generic)
  async verifyQR(qrData: string): Promise<ApiResponse<QRVerificationResult>> {
    // Try mileage first, then coupon
    if (qrData.startsWith('MILEAGE:')) {
      const result = await this.verifyMileageQR(qrData);
      if (result.success && result.data) {
        result.data.type = 'mileage';
      }
      return result;
    } else {
      return this.request('/api/coupons/verify-qr', {
        method: 'POST',
        body: JSON.stringify({ qrData }),
      });
    }
  }

  // Mileage usage
  async useMileage(data: MileageUseRequest): Promise<ApiResponse> {
    return this.request('/api/mileage/use', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Coupon usage
  async useCoupon(data: CouponUseRequest): Promise<ApiResponse> {
    return this.request('/api/qr/use/coupon', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get current business info (assuming there's an endpoint for this)
  async getCurrentBusiness(): Promise<ApiResponse<{ id: number; name: string }>> {
    return this.request('/api/businesses/current');
  }

  // Auth check
  async checkAuth(): Promise<ApiResponse<{ userId: number; role: string }>> {
    return this.request('/api/auth/check');
  }
}

export const apiClient = new ApiClient();

// Helper functions
export const qrApi = {
  verify: (qrData: string) => apiClient.verifyQR(qrData),
  useMileage: (data: MileageUseRequest) => apiClient.useMileage(data),
  useCoupon: (data: CouponUseRequest) => apiClient.useCoupon(data),
};

export const businessApi = {
  getCurrent: () => apiClient.getCurrentBusiness(),
};

export const authApi = {
  check: () => apiClient.checkAuth(),
};

export type { QRVerificationResult, MileageUseRequest, CouponUseRequest };