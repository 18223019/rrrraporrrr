/**
 * Toast Component - Notification system
 * Using react-hot-toast with custom styling
 */

import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Custom Toast Provider with styled toaster
export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--bento-shadow-hover)',
          borderRadius: 'var(--bento-radius)',
          padding: '16px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: 'var(--gauge-success)',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--gauge-danger)',
            secondary: '#fff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              {icon}
              <div style={{ flex: 1 }}>{message}</div>
              {t.type !== 'loading' && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-tertiary)',
                  }}
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

// Utility functions for different toast types
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <CheckCircle size={20} />,
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      icon: <XCircle size={20} />,
    });
  },
  
  info: (message: string) => {
    toast(message, {
      icon: <Info size={20} color="var(--primary-500)" />,
    });
  },
  
  warning: (message: string) => {
    toast(message, {
      icon: <AlertCircle size={20} color="var(--gauge-warning)" />,
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },
  
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};

export default showToast;
