import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Milliseconds before auto-dismiss. 0 means manual dismiss only. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, type = 'info', duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Helper façade so callers don't have to import the store hook everywhere.
// `useToastStore.getState()` is safe to call outside React render — it's the
// underlying Zustand vanilla store.
export const toast = {
  success(message: string, duration?: number) {
    return useToastStore.getState().push(message, 'success', duration);
  },
  error(message: string, duration?: number) {
    return useToastStore.getState().push(message, 'error', duration);
  },
  info(message: string, duration?: number) {
    return useToastStore.getState().push(message, 'info', duration);
  },
};
