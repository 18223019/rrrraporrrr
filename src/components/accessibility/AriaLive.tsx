/**
 * AriaLive Component
 * WCAG 2.1 - Status Messages (4.1.3)
 * Live region for screen reader announcements
 */

import React from 'react';
import './AriaLive.css';

interface AriaLiveProps {
  message: string;
  priority?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text' | 'additions removals' | 'removals additions' | 'removals text' | 'text additions' | 'text removals';
}

export const AriaLive: React.FC<AriaLiveProps> = ({
  message,
  priority = 'polite',
  atomic = true,
  relevant = 'additions text',
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="aria-live"
    >
      {message}
    </div>
  );
};

/**
 * Global AriaLive container
 * Mount this once in your app root
 */
export const AriaLiveRegion: React.FC = () => {
  return (
    <>
      <div
        id="sr-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="aria-live"
      />
      <div
        id="sr-assertive-region"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="aria-live"
      />
    </>
  );
};

export default AriaLive;
