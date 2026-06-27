/**
 * VisuallyHidden Component
 * Hides content visually but keeps it accessible to screen readers
 * WCAG 2.1 - Alternative text and descriptions
 */

import React from 'react';
import './VisuallyHidden.css';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  as: Component = 'span' 
}) => {
  return (
    <Component className="visually-hidden">
      {children}
    </Component>
  );
};

export default VisuallyHidden;
