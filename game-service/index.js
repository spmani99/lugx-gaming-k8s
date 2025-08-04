const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = require('./db');
const { Game, GameCategory } = require('./models/Game');
const { authenticateAPIKey } = require('./middleware/apiAuth');

const app = express();
const port = process.env.PORT;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// Sync DB and seed categories
sequelize.sync().then(async () => {
  console.log('🎮 Game Service Database Synced');
  
  // Seed categories if they don't exist
  const categoryCount = await GameCategory.count();
  if (categoryCount === 0) {
    await GameCategory.bulkCreate([
      { name: 'Action' },
      { name: 'Adventure' },
      { name: 'Strategy' },
      { name: 'Racing' },
      { name: 'RPG' }
    ]);
    console.log('Categories seeded');
  }
}).catch(console.error);

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LUGX Gaming API - Game Service',
    authentication: 'API Key required',
    version: '1.0.0'
  });
});

// All routes require API key
app.get('/games', authenticateAPIKey, async (req, res) => {
  try {
    const { category, limit = 10, offset = 0 } = req.query;
    
    let whereClause = {};
    if (category) {
      whereClause.categoryId = category;
    }

    const games = await Game.findAndCountAll({
      where: whereClause,
      include: [{ model: GameCategory, as: 'category' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        games: games.rows,
        total: games.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('Get games error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.get('/games/:id', authenticateAPIKey, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id, {
      include: [{ model: GameCategory, as: 'category' }]
    });
    if (!game) return res.status(404).json({ 
      success: false, 
      error: 'Game not found' 
    });
    res.json({
      success: true,
      data: { game }
    });
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.get('/categories', authenticateAPIKey, async (req, res) => {
  try {
    const categories = await GameCategory.findAll({
      order: [['name', 'ASC']]
    });
    res.json({
      success: true,
      data: { categories }
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.post('/games', authenticateAPIKey, async (req, res) => {
  try {
    const game = await Game.create(req.body);
    const gameWithCategory = await Game.findByPk(game.id, {
      include: [{ model: GameCategory, as: 'category' }]
    });
    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: { game: gameWithCategory }
    });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
});

app.put('/games/:id', authenticateAPIKey, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ 
      success: false,
      error: 'Game not found' 
    });
    
    await game.update(req.body);
    const updatedGame = await Game.findByPk(game.id, {
      include: [{ model: GameCategory, as: 'category' }]
    });
    res.json({
      success: true,
      message: 'Game updated successfully',
      data: { game: updatedGame }
    });
  } catch (err) {
    console.error('Update game error:', err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
});

app.delete('/games/:id', authenticateAPIKey, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ 
      success: false,
      error: 'Game not found' 
    });
    await game.destroy();
    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (err) {
    console.error('Delete game error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.post('/categories', authenticateAPIKey, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ 
      success: false,
      error: 'Name is required' 
    });
    
    const category = await GameCategory.create({ name });
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ 
        success: false,
        error: 'Category already exists' 
      });
    } else {
      console.error('Create category error:', err);
      res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
  }
});

app.put('/categories/:id', authenticateAPIKey, async (req, res) => {
  try {
    const category = await GameCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ 
      success: false,
      error: 'Category not found' 
    });
    
    await category.update(req.body);
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ 
        success: false,
        error: 'Category name already exists' 
      });
    } else {
      console.error('Update category error:', err);
      res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
  }
});

app.delete('/categories/:id', authenticateAPIKey, async (req, res) => {
  try {
    const category = await GameCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ 
      success: false,
      error: 'Category not found' 
    });
    
    // Check if category has games
    const gameCount = await Game.count({ where: { categoryId: req.params.id } });
    if (gameCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Cannot delete category. ${gameCount} games are using this category.` 
      });
    }
    
    await category.destroy();
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Game Service listening on port ${port}`);
});
