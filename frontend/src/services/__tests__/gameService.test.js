import axios from 'axios';
import { 
  fetchGames, 
  fetchGameById, 
  fetchCategories 
} from '../gameService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Game Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchGames', () => {
    it('should fetch games successfully', async () => {
      const mockGames = [
        { id: 1, title: 'Test Game 1', price: 29.99 },
        { id: 2, title: 'Test Game 2', price: 39.99 }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          games: mockGames
        }
      });

      const result = await fetchGames();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8082/games',
        {
          headers: {
            'x-api-key': expect.any(String)
          }
        }
      );
      expect(result).toEqual(mockGames);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Network Error';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(fetchGames()).rejects.toThrow(errorMessage);
    });

    it('should handle API response without games', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true
        }
      });

      const result = await fetchGames();
      expect(result).toEqual([]);
    });
  });

  describe('fetchGameById', () => {
    it('should fetch specific game successfully', async () => {
      const mockGame = { id: 1, title: 'Test Game', price: 29.99 };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          game: mockGame
        }
      });

      const result = await fetchGameById(1);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8082/games/1',
        {
          headers: {
            'x-api-key': expect.any(String)
          }
        }
      );
      expect(result).toEqual(mockGame);
    });

    it('should handle game not found', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Game not found' }
        }
      });

      await expect(fetchGameById(999)).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'Game not found' }
        }
      });
    });
  });

  describe('fetchCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Adventure' }
      ];

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          categories: mockCategories
        }
      });

      const result = await fetchCategories();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8082/categories',
        {
          headers: {
            'x-api-key': expect.any(String)
          }
        }
      );
      expect(result).toEqual(mockCategories);
    });

    it('should handle empty categories response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true
        }
      });

      const result = await fetchCategories();
      expect(result).toEqual([]);
    });
  });
});
