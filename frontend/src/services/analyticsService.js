import axios from 'axios';

class AnalyticsService {
  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_ANALYTICS_API || '/api/analytics';  // ADD FALLBACK
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.pageStartTime = Date.now();
    this.scrollMilestones = new Set();
    this.maxScrollDepth = 0;
    this.isTracking = true;

    // Initialize session tracking
    this.initializeSession();
    
    // Set up beforeunload listener for session end tracking
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Set up visibility change listener for more accurate session tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endSession();
      } else {
        this.startSession();
      }
    });
  }

  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  getUserId() {
    // Try to get existing user ID
    let userId = localStorage.getItem('userId');
    
    if (!userId || userId === 'anonymous') {
      // Generate a unique persistent ID for this browser
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
      console.log('Generated new user ID:', userId);
    }
    
    return userId;
  }

  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let device = 'desktop';
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      device = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      device = 'mobile';
    }

    return {
      userAgent,
      device,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height
      }
    };
  }

  async sendTrackingData(endpoint, data) {
    if (!this.isTracking) return;

    try {
      await axios.post(`${this.apiBaseUrl}/track/${endpoint}`, {
        ...data,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error sending ${endpoint} data:`, error);
    }
  }

  // Session Management
  initializeSession() {
    this.sessionStartTime = Date.now();
    this.pageCount = 1;
    
    const sessionData = {
      startTime: new Date().toISOString(),
      pageCount: this.pageCount,
      initialReferrer: document.referrer,
      ...this.getDeviceInfo()
    };

    this.sendTrackingData('session', sessionData);
  }

  startSession() {
    if (!this.sessionStartTime) {
      this.sessionStartTime = Date.now();
    }
  }

  endSession() {
    if (this.sessionStartTime) {
      const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      
      const sessionData = {
        endTime: new Date().toISOString(),
        duration,
        pageCount: this.pageCount
      };

      // Use sendBeacon for reliable tracking on page unload
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({
          ...sessionData,
          userId: this.userId,
          sessionId: this.sessionId
        })], { type: 'application/json' });
        
        navigator.sendBeacon(`${this.apiBaseUrl}/track/session`, blob);
      } else {
        this.sendTrackingData('session', sessionData);
      }
    }
  }

  // Page View Tracking
  trackPageView(pageTitle = document.title, pageUrl = window.location.href) {
    this.pageStartTime = Date.now();
    this.maxScrollDepth = 0;
    this.scrollMilestones.clear();
    this.pageCount++;

    const pageViewData = {
      pageUrl,
      pageTitle,
      referrer: document.referrer,
      viewport: this.getDeviceInfo().viewport,
      device: this.getDeviceInfo().device
    };

    this.sendTrackingData('pageview', pageViewData);

    // Set up scroll tracking for this page
    this.setupScrollTracking();
  }

  // Track page time when leaving
  trackPageTime(pageUrl = window.location.href) {
    if (this.pageStartTime) {
      const timeOnPage = Math.floor((Date.now() - this.pageStartTime) / 1000);
      
      const pageTimeData = {
        pageUrl,
        timeOnPage,
        finalScrollDepth: this.maxScrollDepth
      };

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({
          ...pageTimeData,
          userId: this.userId,
          sessionId: this.sessionId
        })], { type: 'application/json' });
        
        navigator.sendBeacon(`${this.apiBaseUrl}/track/pageview`, blob);
      } else {
        this.sendTrackingData('pageview', pageTimeData);
      }
    }
  }

  // Click Event Tracking
  trackClick(event) {
    const element = event.target;
    const rect = element.getBoundingClientRect();
    
    const clickData = {
      pageUrl: window.location.href,
      elementType: element.tagName.toLowerCase(),
      elementText: element.textContent?.trim().substring(0, 100) || '',
      elementId: element.id || '',
      elementClass: element.className || '',
      clickPosition: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY)
      },
      elementPosition: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };

    this.sendTrackingData('click', clickData);
  }

  // Scroll Depth Tracking
  setupScrollTracking() {
    let scrollTimeout;
    
    const trackScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.calculateScrollDepth();
      }, 150); // Debounce scroll events
    };

    // Remove existing listeners to avoid duplicates
    window.removeEventListener('scroll', trackScroll);
    window.addEventListener('scroll', trackScroll, { passive: true });
  }

  calculateScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    const scrollPercentage = Math.round((scrollTop + windowHeight) / documentHeight * 100);
    const currentScrollDepth = Math.min(scrollPercentage, 100);

    // Update max scroll depth
    if (currentScrollDepth > this.maxScrollDepth) {
      this.maxScrollDepth = currentScrollDepth;
    }

    // Track milestone achievements
    const milestones = [25, 50, 75, 100];
    milestones.forEach(milestone => {
      if (currentScrollDepth >= milestone && !this.scrollMilestones.has(milestone)) {
        this.scrollMilestones.add(milestone);
        this.trackScrollMilestone(milestone);
      }
    });
  }

  trackScrollMilestone(milestone) {
    const scrollData = {
      pageUrl: window.location.href,
      maxScrollDepth: this.maxScrollDepth,
      scrollMilestones: Array.from(this.scrollMilestones),
      milestone: milestone,
      pageHeight: Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ),
      viewportHeight: window.innerHeight,
      timeToMaxScroll: Math.floor((Date.now() - this.pageStartTime) / 1000)
    };

    this.sendTrackingData('scroll', scrollData);
  }

  // Manual scroll depth tracking (call this when page is about to be left)
  trackFinalScrollDepth() {
    this.calculateScrollDepth();
    
    const scrollData = {
      pageUrl: window.location.href,
      maxScrollDepth: this.maxScrollDepth,
      scrollMilestones: Array.from(this.scrollMilestones),
      pageHeight: Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ),
      viewportHeight: window.innerHeight,
      timeToMaxScroll: Math.floor((Date.now() - this.pageStartTime) / 1000)
    };

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({
        ...scrollData,
        userId: this.userId,
        sessionId: this.sessionId
      })], { type: 'application/json' });
      
      navigator.sendBeacon(`${this.apiBaseUrl}/track/scroll`, blob);
    } else {
      this.sendTrackingData('scroll', scrollData);
    }
  }

  // Custom Event Tracking
  trackCustomEvent(eventName, properties = {}) {
    const eventData = {
      pageUrl: window.location.href,
      eventType: 'custom',
      eventName,
      properties
    };

    this.sendTrackingData('event', eventData);
  }

  // Utility Methods
  setUserId(userId) {
    this.userId = userId;
    localStorage.setItem('userId', userId);
  }

  enableTracking() {
    this.isTracking = true;
  }

  disableTracking() {
    this.isTracking = false;
  }

  // Get analytics data (for dashboard)
  async getRealtimePageViews(minutes = 30) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/analytics/realtime/pageviews?minutes=${minutes}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching realtime page views:', error);
      return [];
    }
  }

  async getClickHeatmap(pageUrl, minutes = 30) {
    try {
      const encodedUrl = encodeURIComponent(pageUrl);
      const response = await axios.get(`${this.apiBaseUrl}/analytics/heatmap/${encodedUrl}?minutes=${minutes}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching click heatmap:', error);
      return [];
    }
  }

  async getScrollAnalytics(pageUrl, minutes = 30) {
    try {
      const encodedUrl = encodeURIComponent(pageUrl);
      const response = await axios.get(`${this.apiBaseUrl}/analytics/scroll/${encodedUrl}?minutes=${minutes}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching scroll analytics:', error);
      return [];
    }
  }

  async getDashboardData(hours = 24) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/analytics/dashboard?hours=${hours}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;