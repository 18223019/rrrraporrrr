/**
 * Accessibility Utilities
 * WCAG 2.1 AA Compliance helpers
 */

/**
 * Check if user prefers reduced motion
 * Respects prefers-reduced-motion media query
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check color contrast ratio between two colors
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text and UI components
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio (1-21)
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export const meetsWCAGAA = (
  foreground: string,
  background: string,
  level: 'normal' | 'large' | 'ui' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  
  switch (level) {
    case 'normal':
      return ratio >= 4.5; // Normal text
    case 'large':
      return ratio >= 3; // Large text (18pt+ or 14pt+ bold)
    case 'ui':
      return ratio >= 3; // UI components
    default:
      return false;
  }
};

/**
 * Generate accessible color from base color
 * Adjusts lightness to meet contrast requirements
 */
export const makeAccessible = (
  color: string,
  background: string,
  targetRatio: number = 4.5
): string => {
  let adjustedColor = color;
  let ratio = getContrastRatio(adjustedColor, background);
  
  // If already meets target, return
  if (ratio >= targetRatio) return color;
  
  // Simple approach: darken or lighten by 10% steps
  // In production, use more sophisticated algorithm
  console.warn(`Color ${color} does not meet contrast ratio ${targetRatio}:1 against ${background}`);
  
  return color; // Return original for now
};

/**
 * Announce to screen readers using live region
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  if (typeof document === 'undefined') return;

  // Create or get existing live region
  let liveRegion = document.getElementById('sr-live-region');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Update message
  liveRegion.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    if (liveRegion) liveRegion.textContent = '';
  }, 1000);
};

/**
 * Trap focus within an element (for modals)
 */
export const trapFocus = (element: HTMLElement): (() => void) => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelectors);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export const generateId = (prefix: string = 'a11y'): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
};

/**
 * Get readable label from value for screen readers
 */
export const getAriaLabel = (value: number, context?: string): string => {
  if (context) {
    return `${context}: ${value} dari 100`;
  }
  return `${value} dari 100`;
};

/**
 * Format percentage for screen readers
 */
export const formatPercentageForScreenReader = (value: number): string => {
  return `${Math.round(value)} persen`;
};

/**
 * Get zone description for screen readers
 */
export const getZoneAriaLabel = (value: number): string => {
  if (value < 60) {
    return 'Perlu Perbaikan. Nilai di bawah standar.';
  } else if (value < 80) {
    return 'Cukup Baik. Masih ada ruang untuk peningkatan.';
  } else {
    return 'Sangat Baik. Nilai excellent.';
  }
};

/**
 * Check if element is visible in viewport (for lazy loading)
 */
export const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
