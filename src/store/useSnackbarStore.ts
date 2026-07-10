import { create } from 'zustand';

export type SnackbarVariant = 'error' | 'warning' | 'success' | 'info';

interface SnackbarState {
  visible: boolean;
  message: string;
  variant: SnackbarVariant;
  show: (message: string, variant?: SnackbarVariant) => void;
  hide: () => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  visible: false,
  message: '',
  variant: 'error',
  show: (message, variant = 'error') => set({ visible: true, message, variant }),
  hide: () => set({ visible: false }),
}));