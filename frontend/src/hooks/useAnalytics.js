import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsService from '../services/analyticsService';

// Main analytics hook for automatic tracking
export const useAnalytics = () => {
  const location = useLocation();
  const previousLocation = useRef(location.pathname);
  const trackingTimeoutRef = useRef(null);

  useEffect(() => {
    // Track page view when location changes
    if (previousLocation.current !== location.pathname) {
      // DON'T track time on previous page for route changes
      // analyticsService.trackPageTime();
      // analyticsService.trackFinalScrollDepth();

      // Clear any pending tracking
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current);
      }

      // Delay tracking to ensure page title is set
      trackingTimeoutRef.current = setTimeout(() => {
        analyticsService.trackPageView(
          document.title,
          window.location.href
        );
      }, 100);
      
      previousLocation.current = location.pathname;
    }
  }, [location]);

  useEffect(() => {
    // Set up global click tracking
    const handleClick = (event) => {
      analyticsService.trackClick(event);
    };

    document.addEventListener('click', handleClick, true);

    // Cleanup function
    return () => {
      document.removeEventListener('click', handleClick, true);
      analyticsService.trackPageTime();
      analyticsService.trackFinalScrollDepth();
      
      // Clear any pending tracking
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current);
      }
    };
  }, []);

  return {
    trackCustomEvent: analyticsService.trackCustomEvent.bind(analyticsService),
    setUserId: analyticsService.setUserId.bind(analyticsService),
    enableTracking: analyticsService.enableTracking.bind(analyticsService),
    disableTracking: analyticsService.disableTracking.bind(analyticsService)
  };
};

// Hook for tracking specific elements
export const useClickTracking = (elementRef, eventName) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleClick = (event) => {
      analyticsService.trackClick(event);
      if (eventName) {
        analyticsService.trackCustomEvent(eventName, {
          elementId: element.id,
          elementClass: element.className,
          elementText: element.textContent?.trim()
        });
      }
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, [elementRef, eventName]);
};

// Hook for form tracking
export const useFormTracking = (formRef, formName) => {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleSubmit = (event) => {
      analyticsService.trackCustomEvent('form_submit', {
        formName,
        pageUrl: window.location.href
      });
    };

    const handleFocus = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        analyticsService.trackCustomEvent('form_field_focus', {
          formName,
          fieldName: event.target.name || event.target.id,
          fieldType: event.target.type
        });
      }
    };

    form.addEventListener('submit', handleSubmit);
    form.addEventListener('focusin', handleFocus);

    return () => {
      form.removeEventListener('submit', handleSubmit);
      form.removeEventListener('focusin', handleFocus);
    };
  }, [formRef, formName]);
};

// Hook for scroll depth tracking (for specific components)
export const useScrollTracking = (elementRef, eventName) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            analyticsService.trackCustomEvent('element_view', {
              eventName,
              elementId: element.id,
              elementClass: element.className,
              intersectionRatio: entry.intersectionRatio
            });
          }
        });
      },
      { threshold: [0.1, 0.5, 0.9] }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, eventName]);
};

// Hook for performance tracking
export const usePerformanceTracking = () => {
  useEffect(() => {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          analyticsService.trackCustomEvent('page_performance', {
            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
          });
        }
      }, 1000);
    });
  }, []);
};

export default useAnalytics;