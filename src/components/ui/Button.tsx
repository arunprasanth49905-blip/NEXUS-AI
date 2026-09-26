import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`nexus-btn nexus-btn-${variant} nexus-btn-${size} ${className} ${isLoading ? 'nexus-btn-loading' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="nexus-btn-spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span className="nexus-btn-icon-left">{leftIcon}</span>
      )}
      <span className="nexus-btn-text">{children}</span>
      {!isLoading && rightIcon && <span className="nexus-btn-icon-right">{rightIcon}</span>}
    </button>
  );
};
