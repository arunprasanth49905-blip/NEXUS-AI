import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="nexus-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`nexus-modal-dialog nexus-modal-${size} animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-modal-title"
        ref={modalRef}
      >
        <div className="nexus-modal-header">
          <div>
            <h2 id="nexus-modal-title" className="nexus-modal-title">
              {title}
            </h2>
            {subtitle && <p className="nexus-modal-subtitle">{subtitle}</p>}
          </div>
          <IconButton
            icon={<X size={18} />}
            aria-label="Close modal"
            onClick={onClose}
            size="sm"
          />
        </div>

        <div className="nexus-modal-body">{children}</div>

        {footer && <div className="nexus-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
