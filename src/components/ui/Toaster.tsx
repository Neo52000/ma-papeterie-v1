import { useEffect } from 'react';
import { useToastStore, type Toast } from '@/stores/toastStore';

// Top-right stack of dismissible toasts. Mounted once in Header.astro so
// every page can call `toast.success(...)` from anywhere without wiring up
// a context provider. Pure CSS animations (transition opacity + translate),
// no extra dependency.

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

const COLORS: Record<Toast['type'], string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-accent/30 bg-accent/10 text-accent',
  info: 'border-primary/15 bg-white text-primary',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const handle = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(handle);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-card-hover ${COLORS[toast.type]}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Fermer la notification"
        className="ml-2 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-current opacity-60 hover:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
