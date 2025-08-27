import { create } from 'zustand';

interface QRModalState {
  isOpen: boolean;
  type: 'mileage' | 'coupon' | null;
  data: any;
  openMileageQR: () => void;
  openCouponQR: (couponId: number) => void;
  closeQR: () => void;
}

export const useQRModal = create<QRModalState>((set) => ({
  isOpen: false,
  type: null,
  data: null,
  openMileageQR: () => set({ isOpen: true, type: 'mileage' }),
  openCouponQR: (couponId: number) => set({ isOpen: true, type: 'coupon', data: { couponId } }),
  closeQR: () => set({ isOpen: false, type: null, data: null }),
}));