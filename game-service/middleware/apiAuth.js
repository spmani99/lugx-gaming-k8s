// Simple single API key authentication for Game Service
const crypto = require('crypto');

class GameAPIKeyManager {
  constructor() {
    this.apiKeys = new Map();
    this.loadKeys();
  }

  loadKeys() {
    // Single API Key (full access)
    const apiKey = process.env.API_KEY || 'lgx_game_' + crypto.randomBytes(16).toString('hex');
    this.apiKeys.set(apiKey, {
      name: 'Game Service Key',
      type: 'full_access',
      permissions: ['read', 'write', 'delete'],
      isActive: true,
      createdAt: new Date()
    });

    console.log('🔑 Game Service API Key:');
    console.log(`🎮 API Key: ${apiKey}`);
  }

  validateAPIKey(apiKey) {
    const keyInfo = this.apiKeys.get(apiKey);
    
    if (!keyInfo || !keyInfo.isActive) {
      return { valid: false, error: 'Invalid or inactive API key' };
    }

    return { valid: true, keyInfo };
  }
}

// Create singleton
const keyManager = new GameAPIKeyManager();

// Simple middleware to authenticate API key
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required in X-API-Key header'
    });
  }

  const validation = keyManager.validateAPIKey(apiKey);
  
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: validation.error
    });
  }

  req.apiKeyInfo = validation.keyInfo;
  next();
};

module.exports = {
  authenticateAPIKey
}; 