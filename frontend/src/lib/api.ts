// API client for typing game

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ScoreData {
  player_name: string;
  score: number;
  round: number;
  time: number;
  category: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  score: number;
  round: number;
  category: string;
}

export interface WordItem {
  category: string;
  word_id: string;
  word: string;
  round: number;
  type: 'normal' | 'bonus' | 'debuff';
  language: 'jp' | 'en';
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  leaderboard?: T;
  words?: T;
  categories?: T;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
          console.error('API error response:', errorData);
        } catch (e) {
          // JSON parsing failed, use default error message
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      console.error('Request URL:', url);
      console.error('Request config:', config);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request('/api/health');
  }

  async submitScore(scoreData: ScoreData): Promise<ApiResponse<ScoreData>> {
    return this.request('/api/game/score', {
      method: 'POST',
      body: JSON.stringify(scoreData),
    });
  }

  async getLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.request('/api/game/leaderboard');
  }

  async getWords(category: string, round: number, language?: 'jp' | 'en'): Promise<ApiResponse<WordItem[]>> {
    const url = language 
      ? `/api/game/words/${category}/${round}?language=${language}`
      : `/api/game/words/${category}/${round}`;
    return this.request(url);
  }

  async getCategories(language: 'jp' | 'en' = 'jp'): Promise<ApiResponse<Category[]>> {
    return this.request(`/api/game/categories?language=${language}`);
  }

  async getTranslation(wordId: string, targetLanguage: 'jp' | 'en'): Promise<ApiResponse<{translation: string}>> {
    return this.request(`/api/game/translation/${wordId}?language=${targetLanguage}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
