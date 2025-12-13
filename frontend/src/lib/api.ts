import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

console.log("API URL:", API_URL); // Debug log

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60 second timeout (optimization can take longer)
});

// Add request interceptor for debugging
client.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
client.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.message, error.response?.status, error.config?.url);
    // Extract error message from response if available
    if (error.response?.data?.detail) {
      error.message = error.response.data.detail;
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.response?.statusText) {
      error.message = `${error.response.status}: ${error.response.statusText}`;
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Dashboard
  async getDashboardStats() {
    try {
      const response = await client.post("/team/evaluate", {
        season: "2024-25",
      }, {
        timeout: 15000, // Increase timeout to 15 seconds
      });
      return response.data;
    } catch (error: any) {
      console.error("API Error:", error);
      // Return default data on error instead of throwing
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn("API timeout - returning default stats");
        return {
          season: "2024-25",
          gameweek: null,
          total_points: 0.0,
          expected_points: 0.0,
          risk_score: 0.5,
          fixture_difficulty: 3.0,
          squad_value: 0.0,
          bank: 100.0,
          players: [],
          captain_id: null,
          vice_captain_id: null,
        };
      }
      throw error;
    }
  },

  // Team
  async evaluateTeam(data: {
    season: string;
    team_id?: number;
    squad_json?: any;
    gameweek?: number;
  }) {
    try {
      // Use longer timeout for team evaluation (30 seconds)
      const response = await client.post("/team/evaluate", data, {
        timeout: 30000,
      });
      console.log("Team evaluation response:", response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error("Team evaluation error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.url,
      });
      throw error;
    }
  },

  async getXGScore(data: {
    season: string;
    squad: any[];
    gameweek?: number;
  }) {
    const response = await client.post("/team/xgscore", data);
    return response.data;
  },

  // Optimization
  async optimizeSquad(data: {
    season: string;
    budget: number;
    exclude_players?: number[];
    lock_players?: number[];
    chip?: string;
    horizon_gw?: number;
  }) {
    // Use longer timeout for optimization (60 seconds)
    const response = await client.post("/optimize/squad", data, {
      timeout: 60000,
    });
    return response.data;
  },

  // Transfers
  async getTradeAdvice(data: {
    season: string;
    out_player_id: number;
    in_player_id: number;
    budget?: number;
  }) {
    const response = await client.post("/trades/advice", data);
    return response.data;
  },

  // Copilot
  async askCopilot(question: string) {
    const response = await client.post("/assistant/ask", {
      question,
    });
    return response.data;
  },

  // ML Predictions
  async predictPoints(data: {
    player_ids: number[];
    season: string;
    gameweek: number;
    model_name?: string;
  }) {
    const response = await client.post("/ml/predict", data);
    return response.data;
  },
};

// Export Player type
export type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
  price: number;
  [key: string]: any;
};

// Standalone function: List players
export async function listPlayers(
  position: string,
  options: {
    season?: string;
    limit?: number;
    offset?: number;
    team?: string;
  } = {}
): Promise<{ players: Player[]; total: number }> {
  const params = new URLSearchParams();
  if (position) params.append("position", position);
  if (options.season) params.append("season", options.season);
  if (options.limit) params.append("limit", String(options.limit));
  if (options.offset) params.append("offset", String(options.offset));
  if (options.team) params.append("team", options.team);

  const response = await client.get(`/players/?${params.toString()}`);
  const players = Array.isArray(response.data) ? response.data : [];
  return {
    players,
    total: players.length, // Backend doesn't return total, so we use array length
  };
}

// Standalone function: Optimize squad
export async function optimizeSquad(data: {
  season: string;
  budget: number;
  exclude_players?: number[];
  lock_players?: number[];
  chip?: string;
  horizon_gw?: number;
  current_squad?: number[];
}) {
  return api.optimizeSquad(data);
}

// Standalone function: Squad summary (uses team evaluation endpoint)
export async function squadSummary(data: {
  season: string;
  budget: number;
  xi_ids: number[];
  bench_ids: number[];
}) {
  // Create squad_json from xi_ids and bench_ids
  const squad_json = {
    xi: data.xi_ids,
    bench: data.bench_ids,
  };
  
  const response = await client.post("/team/evaluate", {
    season: data.season,
    squad_json,
  });
  
  return response.data;
}
