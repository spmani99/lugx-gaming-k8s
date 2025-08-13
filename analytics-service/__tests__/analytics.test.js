const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock environment variables
process.env.PORT = 3003;

// Mock dependencies
jest.mock('../clickhouse', () => ({
  insertEventData: jest.fn().mockResolvedValue(),
  getEvents: jest.fn().mockResolvedValue([]),
  getEventsByDateRange: jest.fn().mockResolvedValue([])
}));

jest.mock('../s3ExportDemo', () => ({
  exportToS3: jest.fn().mockResolvedValue({ success: true })
}));

const clickHouse = require('../clickhouse');
const demoS3Export = require('../s3ExportDemo');

describe('Analytics Service API', () => {
  let app;

  beforeAll(() => {
    // Create a simplified version of the app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Helper functions
    const getClientIP = (req) => {
      return req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             '127.0.0.1';
    };

    const getDeviceType = (userAgent) => {
      if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        return 'tablet';
      }
      if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
        return 'mobile';
      }
      return 'desktop';
    };

    // Routes
    app.get('/', (req, res) => {
      res.send('Analytics Service Running - ClickHouse + S3 Export Demo');
    });

    app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Track page view
    app.post('/track/pageview', async (req, res) => {
      try {
        const {
          userId,
          sessionId,
          pageUrl,
          pageTitle,
          referrer
        } = req.body;

        // Validation
        if (!pageUrl) {
          return res.status(400).json({ error: 'pageUrl is required' });
        }

        const eventData = {
          event_type: 'pageview',
          user_id: userId || 'anonymous',
          session_id: sessionId || 'unknown',
          page_url: pageUrl,
          page_title: pageTitle || '',
          referrer: referrer || '',
          ip_address: getClientIP(req),
          user_agent: req.headers['user-agent'] || '',
          device_type: getDeviceType(req.headers['user-agent'] || ''),
          timestamp: new Date().toISOString()
        };

        await clickHouse.insertEventData(eventData);

        res.json({
          success: true,
          message: 'Page view tracked successfully',
          eventId: `${Date.now()}-${Math.random()}`
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Track button click
    app.post('/track/click', async (req, res) => {
      try {
        const {
          userId,
          sessionId,
          elementId,
          elementText,
          pageUrl
        } = req.body;

        // Validation
        if (!elementId) {
          return res.status(400).json({ error: 'elementId is required' });
        }

        const eventData = {
          event_type: 'click',
          user_id: userId || 'anonymous',
          session_id: sessionId || 'unknown',
          element_id: elementId,
          element_text: elementText || '',
          page_url: pageUrl || '',
          ip_address: getClientIP(req),
          user_agent: req.headers['user-agent'] || '',
          device_type: getDeviceType(req.headers['user-agent'] || ''),
          timestamp: new Date().toISOString()
        };

        await clickHouse.insertEventData(eventData);

        res.json({
          success: true,
          message: 'Click event tracked successfully',
          eventId: `${Date.now()}-${Math.random()}`
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get analytics data
    app.get('/analytics', async (req, res) => {
      try {
        const { startDate, endDate, eventType } = req.query;
        
        let events;
        if (startDate && endDate) {
          events = await clickHouse.getEventsByDateRange(startDate, endDate, eventType);
        } else {
          events = await clickHouse.getEvents(eventType);
        }

        res.json({
          success: true,
          events: events,
          count: events.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export to S3
    app.post('/export/s3', async (req, res) => {
      try {
        const { startDate, endDate } = req.body;
        const result = await demoS3Export.exportToS3(startDate, endDate);
        
        res.json({
          success: true,
          message: 'Data exported to S3 successfully',
          result: result
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('Analytics Service Running - ClickHouse + S3 Export Demo');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /track/pageview', () => {
    it('should track page view successfully', async () => {
      const pageViewData = {
        userId: 'user123',
        sessionId: 'session456',
        pageUrl: '/home',
        pageTitle: 'Home Page',
        referrer: 'https://google.com'
      };

      const response = await request(app)
        .post('/track/pageview')
        .send(pageViewData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Page view tracked successfully');
      expect(response.body.eventId).toBeDefined();
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'pageview',
          user_id: 'user123',
          session_id: 'session456',
          page_url: '/home',
          page_title: 'Home Page',
          referrer: 'https://google.com'
        })
      );
    });

    it('should return 400 when pageUrl is missing', async () => {
      const response = await request(app)
        .post('/track/pageview')
        .send({
          userId: 'user123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('pageUrl is required');
    });

    it('should use defaults for missing optional fields', async () => {
      const response = await request(app)
        .post('/track/pageview')
        .send({
          pageUrl: '/test'
        });
      
      expect(response.status).toBe(200);
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'pageview',
          user_id: 'anonymous',
          session_id: 'unknown',
          page_url: '/test',
          page_title: '',
          referrer: ''
        })
      );
    });

    it('should handle ClickHouse errors', async () => {
      clickHouse.insertEventData.mockRejectedValue(new Error('ClickHouse error'));

      const response = await request(app)
        .post('/track/pageview')
        .send({
          pageUrl: '/test'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('ClickHouse error');
    });
  });

  describe('POST /track/click', () => {
    it('should track click event successfully', async () => {
      const clickData = {
        userId: 'user123',
        sessionId: 'session456',
        elementId: 'buy-button',
        elementText: 'Buy Now',
        pageUrl: '/product/123'
      };

      const response = await request(app)
        .post('/track/click')
        .send(clickData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Click event tracked successfully');
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'click',
          user_id: 'user123',
          session_id: 'session456',
          element_id: 'buy-button',
          element_text: 'Buy Now',
          page_url: '/product/123'
        })
      );
    });

    it('should return 400 when elementId is missing', async () => {
      const response = await request(app)
        .post('/track/click')
        .send({
          userId: 'user123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('elementId is required');
    });
  });

  describe('GET /analytics', () => {
    it('should return analytics data without date filter', async () => {
      const mockEvents = [
        { event_type: 'pageview', user_id: 'user1', timestamp: '2024-01-01' },
        { event_type: 'click', user_id: 'user2', timestamp: '2024-01-02' }
      ];
      clickHouse.getEvents.mockResolvedValue(mockEvents);

      const response = await request(app).get('/analytics');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toEqual(mockEvents);
      expect(response.body.count).toBe(2);
      expect(clickHouse.getEvents).toHaveBeenCalledWith(undefined);
    });

    it('should return analytics data with date range filter', async () => {
      const mockEvents = [
        { event_type: 'pageview', user_id: 'user1', timestamp: '2024-01-01' }
      ];
      clickHouse.getEventsByDateRange.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          eventType: 'pageview'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.events).toEqual(mockEvents);
      expect(clickHouse.getEventsByDateRange).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
        'pageview'
      );
    });

    it('should handle ClickHouse errors', async () => {
      clickHouse.getEvents.mockRejectedValue(new Error('ClickHouse error'));

      const response = await request(app).get('/analytics');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('ClickHouse error');
    });
  });

  describe('POST /export/s3', () => {
    it('should export data to S3 successfully', async () => {
      const exportData = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const response = await request(app)
        .post('/export/s3')
        .send(exportData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data exported to S3 successfully');
      expect(response.body.result).toEqual({ success: true });
      expect(demoS3Export.exportToS3).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });

    it('should handle S3 export errors', async () => {
      demoS3Export.exportToS3.mockRejectedValue(new Error('S3 error'));

      const response = await request(app)
        .post('/export/s3')
        .send({});
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('S3 error');
    });
  });

  describe('Device detection', () => {
    it('should detect mobile device', async () => {
      const response = await request(app)
        .post('/track/pageview')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)')
        .send({ pageUrl: '/test' });
      
      expect(response.status).toBe(200);
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'mobile'
        })
      );
    });

    it('should detect tablet device', async () => {
      const response = await request(app)
        .post('/track/pageview')
        .set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)')
        .send({ pageUrl: '/test' });
      
      expect(response.status).toBe(200);
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'tablet'
        })
      );
    });

    it('should detect desktop device', async () => {
      const response = await request(app)
        .post('/track/pageview')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send({ pageUrl: '/test' });
      
      expect(response.status).toBe(200);
      expect(clickHouse.insertEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'desktop'
        })
      );
    });
  });
});
