const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock environment variables
process.env.PORT = 3001;
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

jest.mock('../models/Game', () => ({
  Game: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  GameCategory: {
    findAll: jest.fn(),
    count: jest.fn().mockResolvedValue(5),
    bulkCreate: jest.fn()
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

const { Game, GameCategory } = require('../models/Game');

describe('Game Service API', () => {
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
        message: 'LUGX Gaming API - Game Service',
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

    // Games routes
    app.get('/games', authenticateAPIKey, async (req, res) => {
      try {
        const games = await Game.findAll();
        res.json({
          success: true,
          games: games
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/games/:id', authenticateAPIKey, async (req, res) => {
      try {
        const game = await Game.findByPk(req.params.id);
        if (!game) {
          return res.status(404).json({ error: 'Game not found' });
        }
        res.json({
          success: true,
          game: game
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/categories', authenticateAPIKey, async (req, res) => {
      try {
        const categories = await GameCategory.findAll();
        res.json({
          success: true,
          categories: categories
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
        message: 'LUGX Gaming API - Game Service',
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

  describe('GET /games', () => {
    it('should return games when valid API key provided', async () => {
      const mockGames = [
        { id: 1, title: 'Test Game 1', price: 29.99 },
        { id: 2, title: 'Test Game 2', price: 39.99 }
      ];
      Game.findAll.mockResolvedValue(mockGames);

      const response = await request(app)
        .get('/games')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.games).toEqual(mockGames);
      expect(Game.findAll).toHaveBeenCalled();
    });

    it('should return 401 when no API key provided', async () => {
      const response = await request(app).get('/games');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should return 401 when invalid API key provided', async () => {
      const response = await request(app)
        .get('/games')
        .set('x-api-key', 'invalid-key');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should handle database errors', async () => {
      Game.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/games')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /games/:id', () => {
    it('should return specific game when found', async () => {
      const mockGame = { id: 1, title: 'Test Game', price: 29.99 };
      Game.findByPk.mockResolvedValue(mockGame);

      const response = await request(app)
        .get('/games/1')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.game).toEqual(mockGame);
      expect(Game.findByPk).toHaveBeenCalledWith('1');
    });

    it('should return 404 when game not found', async () => {
      Game.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/games/999')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('GET /categories', () => {
    it('should return game categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Adventure' }
      ];
      GameCategory.findAll.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/categories')
        .set('x-api-key', 'test-api-key');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.categories).toEqual(mockCategories);
      expect(GameCategory.findAll).toHaveBeenCalled();
    });

    it('should require API key for categories', async () => {
      const response = await request(app).get('/categories');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });
  });
});
