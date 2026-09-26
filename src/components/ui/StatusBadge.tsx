import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import type { SystemStatusType } from '../../types';
import './StatusBadge.css';

export interface StatusBadgeProps {
  status: SystemStatusType;
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ready':
        return {
          text: label || 'Ready',
          icon: <CheckCircle2 size={13} className="nexus-status-icon" aria-hidden="true" />,
          colorClass: 'nexus-status-ready',
        };
      case 'processing':
        return {
          text: label || 'Processing',
          icon: <RefreshCw size={13} className="nexus-status-icon nexus-spin-slow" aria-hidden="true" />,
          colorClass: 'nexus-status-processing',
        };
      case 'limited':
        return {
          text: label || 'Limited',
          icon: <AlertTriangle size={13} className="nexus-status-icon" aria-hidden="true" />,
          colorClass: 'nexus-status-limited',
        };
      case 'offline':
        return {
          text: label || 'Offline / Standalone',
          icon: <WifiOff size={13} className="nexus-status-icon" aria-hidden="true" />,
          colorClass: 'nexus-status-offline',
        };
      case 'error':
        return {
          text: label || 'Error',
          icon: <AlertCircle size={13} className="nexus-status-icon" aria-hidden="true" />,
          colorClass: 'nexus-status-error',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`nexus-status-badge ${config.colorClass} nexus-status-${size} ${className}`}
      role="status"
      aria-label={`Status: ${config.text}`}
    >
      <span className="nexus-status-dot" aria-hidden="true" />
      {showIcon && config.icon}
      <span className="nexus-status-text">{config.text}</span>
    </span>
  );
};
