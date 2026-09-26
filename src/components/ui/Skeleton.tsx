import React from 'react';
import './Skeleton.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  className = '',
}) => {
  return (
    <div
      className={`nexus-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="nexus-skeleton-card">
      <Skeleton width="40%" height="20px" />
      <Skeleton width="90%" height="14px" />
      <Skeleton width="75%" height="14px" />
      <div className="nexus-skeleton-row">
        <Skeleton width="25%" height="28px" borderRadius="var(--radius-md)" />
        <Skeleton width="25%" height="28px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
};
