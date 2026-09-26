import React from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`nexus-page-header ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="nexus-breadcrumbs">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="nexus-breadcrumb-sep" aria-hidden="true">/</span>}
              {crumb.onClick ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="nexus-breadcrumb-link"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="nexus-breadcrumb-current">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="nexus-page-header-row">
        <div className="nexus-page-header-titles">
          <div className="nexus-page-header-title-wrap">
            <h1 className="nexus-page-title">{title}</h1>
            {badge && <div className="nexus-page-badge">{badge}</div>}
          </div>
          {subtitle && <p className="nexus-page-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="nexus-page-header-actions">{actions}</div>}
      </div>
    </div>
  );
};
