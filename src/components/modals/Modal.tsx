/**
 * Modal Component - Base modal/dialog component
 * Paket 3 - For parameter detail views
 * Paket 4 - Enhanced with WCAG 2.1 AA accessibility
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap, usePrefersReducedMotion } from '../../hooks/useAccessibility';
import { generateId } from '../../utils/accessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const getSizeStyles = (size: ModalProps['size']) => {
  switch (size) {
    case 'sm':
      return { maxWidth: '400px' };
    case 'md':
      return { maxWidth: '600px' };
    case 'lg':
      return { maxWidth: '800px' };
    case 'xl':
      return { maxWidth: '1000px' };
    case 'full':
      return { maxWidth: '95vw', maxHeight: '95vh' };
    default:
      return { maxWidth: '600px' };
  }
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('modal-title')).current;
  const descId = useRef(generateId('modal-desc')).current;
  const prefersReducedMotion = usePrefersReducedMotion();

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  // Handle ESC key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const sizeStyles = getSizeStyles(size);

  // Animation variants with reduced motion support
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={closeOnOverlayClick ? onClose : undefined}
            role="presentation"
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            {/* Modal Content */}
            <motion.div
              ref={modalRef}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              transition={{ type: 'spring', damping: 30, stiffness: 500 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={descId}
              tabIndex={-1}
              style={{
                ...sizeStyles,
                width: '100%',
                maxHeight: '90vh',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--bento-radius)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  {title && (
                    <h2
                      id={titleId}
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      type="button"
                      className="modal-close"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                      aria-label="Tutup dialog"
                    >
                      <X size={24} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div
                id={descId}
                style={{
                  padding: '1.5rem',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
