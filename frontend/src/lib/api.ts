// API client for typing game

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ScoreData {
  player_name: string;
  score: number;
  round: number;
  time: number;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  score: number;
  round: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  leaderboard?: T;
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
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
}

export const apiClient = new ApiClient(API_BASE_URL);
