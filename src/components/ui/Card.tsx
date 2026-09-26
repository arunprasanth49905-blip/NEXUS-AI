import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const isInteractive = variant === 'interactive' || Boolean(onClick);

  return (
    <div
      className={`nexus-card nexus-card-${variant} nexus-card-p-${padding} ${isInteractive ? 'nexus-card-interactive' : ''} ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      {...props}
    >
      {header && <div className="nexus-card-header">{header}</div>}
      <div className="nexus-card-body">{children}</div>
      {footer && <div className="nexus-card-footer">{footer}</div>}
    </div>
  );
};
