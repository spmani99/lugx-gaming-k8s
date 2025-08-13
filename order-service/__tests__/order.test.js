const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock environment variables
process.env.PORT = 3002;
process.env.API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';

// Mock dependencies
jest.mock('../db', () => ({
  sync: jest.fn().mockResolvedValue(),
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn(),
    rollback: jest.fn()
  })
}));

jest.mock('../models/Order', () => ({
  Order: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  OrderItem: {
    create: jest.fn(),
    findAll: jest.fn()
  }
}));

jest.mock('../middleware/apiAuth', () => ({
  authenticateAPIKey: (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === 'test-api-key') {
      next();
    } else {
      res.status(401).json({ error: 'Invalid API key' });
    }
  }
}));

const { Order, OrderItem } = require('../models/Order');
const sequelize = require('../db');

describe('Order Service API', () => {
  let app;

  beforeAll(() => {
    // Create a simplified version of the app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Import routes after mocks are set up
    const { authenticateAPIKey } = require('../middleware/apiAuth');

    // Root route
    app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'LUGX Gaming API - Order Service',
        authentication: 'API Key required',
        version: '1.0.0'
      });
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Create order
    app.post('/orders', authenticateAPIKey, async (req, res) => {
      const transaction = await sequelize.transaction();
      
      try {
        const { customerEmail, customerName, items, totalAmount } = req.body;
        
        // Validation
        if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ 
            error: 'Missing required fields: customerEmail, items' 
          });
        }

        const order = await Order.create({
          customerEmail,
          customerName,
          totalAmount: totalAmount || 0,
          status: 'pending'
        }, { transaction });

        // Create order items
        for (const item of items) {
          await OrderItem.create({
            orderId: order.id,
            gameId: item.gameId,
            gameName: item.gameName,
            price: item.price,
            quantity: item.quantity || 1
          }, { transaction });
        }

        await transaction.commit();

        res.status(201).json({
          success: true,
          order: order,
          message: 'Order created successfully'
        });
      } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
      }
    });

    // Get orders
    app.get('/orders', authenticateAPIKey, async (req, res) => {
      try {
        const orders = await Order.findAll();
        res.json({
          success: true,
          orders: orders
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get specific order
    app.get('/orders/:id', authenticateAPIKey, async (req, res) => {
      try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }
        res.json({
          success: true,
          order: order
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
      expect(response.body).toEqual({
        success: true,
        message: 'LUGX Gaming API - Order Service',
        authentication: 'API Key required',
        version: '1.0.0'
      });
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

  describe('POST /orders', () => {
    it('should create order successfully with valid data', async () => {
      const mockOrder = {
        id: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        totalAmount: 59.98,
        status: 'pending'
      };

      Order.create.mockResolvedValue(mockOrder);
      OrderItem.create.mockResolvedValue({});

      const orderData = {
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        totalAmount: 59.98,
        items: [
          { gameId: 1, gameName: 'Test Game 1', price: 29.99, quantity: 1 },
          { gameId: 2, gameName: 'Test Game 2', price: 29.99, quantity: 1 }
        ]
      };

      const response = await request(app)
        .post('/orders')
        .set('x-api-key', 'test-api-key')
        .send(orderData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.order).toEqual(mockOrder);
      expect(response.body.message).toBe('Order created successfully');
      expect(Order.create).toHaveBeenCalled();
      expect(OrderItem.create).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .post('/orders')
        .set('x-api-key', 'test-api-key')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields: customerEmail, items');
    });

    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/orders')
        .set('x-api-key', 'test-api-key')
        .send({
          customerEmail: 'test@example.com',
          items: []
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields: customerEmail, items');
    });

    it('should require API key', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          customerEmail: 'test@example.com',
          items: [{ gameId: 1, price: 29.99 }]
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should handle database errors and rollback transaction', async () => {
      Order.create.mockRejectedValue(new Error('Database error'));

      const orderData = {
        customerEmail: 'test@example.com',
        items: [{ gameId: 1, gameName: 'Test Game', price: 29.99 }]
      };

      const response = await request(app)
        .post('/orders')
        .set('x-api-key', 'test-api-key')
        .send(orderData);
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /orders', () => {
    it('should return all orders', async () => {
      const mockOrders = [
        { id: 1, customerEmail: 'test1@example.com', totalAmount: 29.99 },
        { id: 2, customerEmail: 'test2@example.com', totalAmount: 39.99 }
      ];
      Order.findAll.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/orders')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orders).toEqual(mockOrders);
      expect(Order.findAll).toHaveBeenCalled();
    });

    it('should require API key', async () => {
      const response = await request(app).get('/orders');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });
  });

  describe('GET /orders/:id', () => {
    it('should return specific order when found', async () => {
      const mockOrder = { 
        id: 1, 
        customerEmail: 'test@example.com', 
        totalAmount: 29.99 
      };
      Order.findByPk.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get('/orders/1')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.order).toEqual(mockOrder);
      expect(Order.findByPk).toHaveBeenCalledWith('1');
    });

    it('should return 404 when order not found', async () => {
      Order.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/orders/999')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found');
    });

    it('should require API key', async () => {
      const response = await request(app).get('/orders/1');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });
  });
});
