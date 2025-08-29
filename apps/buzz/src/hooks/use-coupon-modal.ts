import { create } from 'zustand';

interface CouponModalStore {
  isOpen: boolean;
  openCouponModal: () => void;
  closeCouponModal: () => void;
}

export const useCouponModal = create<CouponModalStore>((set) => ({
  isOpen: false,
  openCouponModal: () => set({ isOpen: true }),
  closeCouponModal: () => set({ isOpen: false }),
}));