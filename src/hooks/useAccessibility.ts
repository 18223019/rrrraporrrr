/**
 * Accessibility React Hooks
 * Custom hooks for WCAG 2.1 AA compliance
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { prefersReducedMotion, trapFocus, announceToScreenReader } from '../utils/accessibility';

/**
 * Hook to detect if user prefers reduced motion
 * Updates when system preference changes
 */
export const usePrefersReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setReducedMotion(event.matches);
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return reducedMotion;
};

/**
 * Hook for keyboard navigation
 * Handles common keyboard shortcuts
 */
export const useKeyboardNavigation = (
  onEscape?: () => void,
  onEnter?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
};

/**
 * Hook for focus trap (modals, dialogs)
 */
export const useFocusTrap = (isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Trap focus
    const cleanup = trapFocus(containerRef.current);

    // Restore focus on cleanup
    return () => {
      cleanup();
      previousFocusRef.current?.focus();
    };
  }, [isActive, containerRef]);
};

/**
 * Hook for managing focus on mount
 */
export const useAutoFocus = (enabled: boolean = true) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (enabled && ref.current) {
      // Small delay to ensure element is ready
      setTimeout(() => {
        ref.current?.focus();
      }, 100);
    }
  }, [enabled]);

  return ref;
};

/**
 * Hook for announcing to screen readers
 */
export const useAnnouncer = () => {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );

  return announce;
};

/**
 * Hook for visible focus management
 * Shows focus outline only for keyboard navigation, not mouse clicks
 */
export const useVisibleFocus = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboardUser;
};

/**
 * Hook for lazy loading with Intersection Observer
 */
export const useLazyLoad = (
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return { isIntersecting, hasIntersected };
};

/**
 * Hook for skip link functionality
 */
export const useSkipLink = (targetId: string) => {
  const handleSkip = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [targetId]
  );

  return handleSkip;
};

/**
 * Hook for managing aria-live regions
 */
export const useAriaLive = () => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((msg: string, prio: 'polite' | 'assertive' = 'polite') => {
    setMessage(msg);
    setPriority(prio);

    // Clear message after announcement
    setTimeout(() => setMessage(''), 1000);
  }, []);

  return { message, priority, announce };
};

/**
 * Hook for color scheme detection (light/dark mode)
 */
export const useColorScheme = (): 'light' | 'dark' | null => {
  const [scheme, setScheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setScheme(e.matches ? 'dark' : 'light');
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return scheme;
};

/**
 * Hook for managing document title (for screen readers)
 */
export const useDocumentTitle = (title: string, retainOnUnmount: boolean = false) => {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    document.title = title;

    return () => {
      if (!retainOnUnmount) {
        document.title = previousTitle.current;
      }
    };
  }, [title, retainOnUnmount]);
};

/**
 * Hook for managing body scroll lock (for modals)
 */
export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
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
  }, [isLocked]);
};
