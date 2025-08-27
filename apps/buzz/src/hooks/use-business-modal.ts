import { create } from 'zustand';

interface BusinessModalState {
  isOpen: boolean;
  businessId: number | null;
  openBusiness: (businessId: number) => void;
  closeBusiness: () => void;
}

export const useBusinessModal = create<BusinessModalState>((set) => ({
  isOpen: false,
  businessId: null,
  openBusiness: (businessId: number) => set({ isOpen: true, businessId }),
  closeBusiness: () => set({ isOpen: false, businessId: null }),
}));