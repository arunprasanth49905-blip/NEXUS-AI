import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`nexus-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="nexus-input-label">
          {label}
        </label>
      )}
      <div className={`nexus-input-box ${error ? 'nexus-input-error' : ''}`}>
        {leftIcon && <span className="nexus-input-icon-left">{leftIcon}</span>}
        <input
          id={inputId}
          className="nexus-input-field"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {rightIcon && <span className="nexus-input-icon-right">{rightIcon}</span>}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="nexus-input-error-msg" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={`${inputId}-helper`} className="nexus-input-helper-msg">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
