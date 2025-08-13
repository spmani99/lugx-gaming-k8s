import axios from 'axios';
import { 
  trackPageView, 
  trackEvent, 
  fetchAnalytics 
} from '../analyticsService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackPageView', () => {
    it('should track page view successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Page view tracked successfully',
          eventId: 'test-event-id'
        }
      });

      const pageData = {
        userId: 'user123',
        sessionId: 'session456',
        pageUrl: '/home',
        pageTitle: 'Home Page'
      };

      const result = await trackPageView(pageData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8084/track/pageview',
        pageData
      );
      expect(result.success).toBe(true);
      expect(result.eventId).toBe('test-event-id');
    });

    it('should handle tracking errors', async () => {
      const errorMessage = 'Tracking failed';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      const pageData = {
        pageUrl: '/test'
      };

      await expect(trackPageView(pageData)).rejects.toThrow(errorMessage);
    });

    it('should track with minimal data', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Page view tracked successfully'
        }
      });

      const result = await trackPageView({ pageUrl: '/minimal' });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8084/track/pageview',
        { pageUrl: '/minimal' }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('trackEvent', () => {
    it('should track click event successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Click event tracked successfully',
          eventId: 'click-event-id'
        }
      });

      const eventData = {
        userId: 'user123',
        sessionId: 'session456',
        elementId: 'buy-button',
        elementText: 'Buy Now',
        pageUrl: '/product/123'
      };

      const result = await trackEvent(eventData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8084/track/click',
        eventData
      );
      expect(result.success).toBe(true);
      expect(result.eventId).toBe('click-event-id');
    });

    it('should handle event tracking errors', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'elementId is required' }
        }
      });

      const eventData = {
        userId: 'user123'
      };

      await expect(trackEvent(eventData)).rejects.toMatchObject({
        response: {
          status: 400,
          data: { error: 'elementId is required' }
        }
      });
    });
  });

  describe('fetchAnalytics', () => {
    it('should fetch analytics data without filters', async () => {
      const mockAnalytics = [
        { event_type: 'pageview', user_id: 'user1', timestamp: '2024-01-01' },
        { event_type: 'click', user_id: 'user2', timestamp: '2024-01-02' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          events: mockAnalytics,
          count: 2
        }
      });

      const result = await fetchAnalytics();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8084/analytics',
        { params: {} }
      );
      expect(result.events).toEqual(mockAnalytics);
      expect(result.count).toBe(2);
    });

    it('should fetch analytics data with date range', async () => {
      const mockAnalytics = [
        { event_type: 'pageview', user_id: 'user1', timestamp: '2024-01-01' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          events: mockAnalytics,
          count: 1
        }
      });

      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        eventType: 'pageview'
      };

      const result = await fetchAnalytics(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8084/analytics',
        { params: filters }
      );
      expect(result.events).toEqual(mockAnalytics);
      expect(result.count).toBe(1);
    });

    it('should handle analytics fetch errors', async () => {
      const errorMessage = 'Analytics service unavailable';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(fetchAnalytics()).rejects.toThrow(errorMessage);
    });

    it('should handle empty analytics response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          events: [],
          count: 0
        }
      });

      const result = await fetchAnalytics();

      expect(result.events).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
});
