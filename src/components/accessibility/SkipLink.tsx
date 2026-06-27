/**
 * SkipLink Component
 * WCAG 2.1 - Bypass Blocks (2.4.1)
 * Allows keyboard users to skip repetitive navigation
 */

import React from 'react';
import './SkipLink.css';

interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId, 
  label = 'Skip to main content' 
}) => {
  const handleSkip = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    
    if (target) {
      // Set tabindex to make it focusable
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Remove tabindex after focus
      target.addEventListener('blur', () => {
        target.removeAttribute('tabindex');
      }, { once: true });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSkip(e);
        }
      }}
    >
      {label}
    </a>
  );
};

export default SkipLink;
