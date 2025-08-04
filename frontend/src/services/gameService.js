import axios from 'axios';

class GameService {
  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_GAME_API;
    this.apiKey = process.env.REACT_APP_GAME_API_KEY;
    
    // Create axios instance with API key
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Get all games
  async getGames(params = {}) {
    try {
      const response = await this.api.get('/games', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  }

  // Get single game
  async getGame(id) {
    try {
      const response = await this.api.get(`/games/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  }

  // Get categories
  async getCategories() {
    try {
      const response = await this.api.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Admin functions (require admin API key)
  async createGame(gameData) {
    try {
      const response = await this.api.post('/games', gameData);
      return response.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  async updateGame(id, gameData) {
    try {
      const response = await this.api.put(`/games/${id}`, gameData);
      return response.data;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  async deleteGame(id) {
    try {
      const response = await this.api.delete(`/games/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }
}

export default new GameService(); 