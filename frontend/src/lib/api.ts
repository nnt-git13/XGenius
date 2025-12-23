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

// Add request interceptor for debugging (only in dev)
if (process.env.NODE_ENV === 'development') {
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
      // Only log non-network errors in detail
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_REFUSED') {
        console.error("API Response Error:", error.message, error.response?.status, error.config?.url);
      }
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
}

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
      // Return default data on network errors instead of throwing
      const isNetworkError = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        // Silently return default data for network errors
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
      if (process.env.NODE_ENV === 'development') {
        console.log("Team evaluation response:", response.status, response.data);
      }
      return response.data;
    } catch (error: any) {
      // Check if it's a network error
      const isNetworkError = 
        error.code === 'ECONNABORTED' || 
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        // Return placeholder data for network errors
        return {
          total_points: 0,
          expected_points: 0,
          squad_value: 0,
          bank: 100,
          players: [],
          captain_id: null,
          vice_captain_id: null,
          xg_score: 0,
          risk_score: 0.5,
          fixture_difficulty: 3.0,
        };
      }
      
      // Only log non-network errors
      if (process.env.NODE_ENV === 'development') {
        console.error("Team evaluation error details:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config?.url,
        });
      }
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
  async askCopilot(
    question: string,
    options?: {
      conversation_id?: number;
      team_id?: number;
      user_id?: number;
      route?: string;
      app_state?: Record<string, any>;
    }
  ) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          conversation_id: options?.conversation_id,
          team_id: options?.team_id,
          user_id: options?.user_id,
          route: options?.route || window.location.pathname,
          app_state: options?.app_state || {},
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Copilot endpoint failed: ${response.status}`);
      }
      
      return response.json();
    } catch (err) {
      console.error("Copilot error:", err);
      throw err;
    }
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

  // FPL proxy (backend -> FPL). Use these instead of calling fantasy.premierleague.com from the browser (CORS).
  async getFplBootstrapStatic() {
    const response = await client.get("/fpl/bootstrap-static", { timeout: 30000 });
    return response.data;
  },

  async getFplElementSummary(playerId: number) {
    const response = await client.get(`/fpl/element-summary/${playerId}`, { timeout: 30000 });
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
    search?: string;
  } = {}
): Promise<{ players: Player[]; total: number }> {
  const params = new URLSearchParams();
  if (position) params.append("position", position);
  if (options.season) params.append("season", options.season);
  if (options.limit) params.append("limit", String(options.limit));
  if (options.offset) params.append("offset", String(options.offset));
  if (options.team) params.append("team", options.team);
  if (options.search) params.append("search", options.search);

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
