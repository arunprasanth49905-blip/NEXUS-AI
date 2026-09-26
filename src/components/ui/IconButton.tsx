import React from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  tooltip,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`nexus-icon-btn nexus-icon-btn-${variant} nexus-icon-btn-${size} ${className}`}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
      {...props}
    >
      <span className="nexus-icon-btn-content" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
};
