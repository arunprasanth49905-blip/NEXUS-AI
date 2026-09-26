import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../types';
import './ToastContainer.css';

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="nexus-toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 size={16} className="text-success" />;
            case 'warning':
              return <AlertTriangle size={16} className="text-warning" />;
            case 'error':
              return <AlertCircle size={16} className="text-error" />;
            default:
              return <Info size={16} className="text-info" />;
          }
        };

        return (
          <div key={toast.id} className={`nexus-toast nexus-toast-${toast.type} animate-fade-in`}>
            <div className="nexus-toast-icon" aria-hidden="true">
              {getIcon()}
            </div>
            <div className="nexus-toast-content">
              <span className="nexus-toast-title">{toast.title}</span>
              {toast.description && <span className="nexus-toast-desc">{toast.description}</span>}
            </div>
            <button
              type="button"
              className="nexus-toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
