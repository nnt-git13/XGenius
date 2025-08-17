/// <reference types="vite/client" />

import axios from "axios";

/** Ensure the base URL ends with a single `/api` */
function withApiSuffix(url?: string) {
  const base = (url ?? "").trim().replace(/\/+$/, "") || "http://localhost:5001";
  return /\/api$/i.test(base) ? base : `${base}/api`;
}

export const api = axios.create({
  baseURL: withApiSuffix(import.meta.env.VITE_API_URL),
  timeout: 15000,
});

// ===== Types =====
export type Position = "GK" | "DEF" | "MID" | "FWD" | "ALL";

export type Player = {
  id: number;
  name: string;
  team: string;
  position: Exclude<Position, "ALL">;
  /** Price in £m */
  price: number;
};

export type ScoreObject = {
  total_score?: number;
  form?: number;
  fixture?: number;
  xg?: number;
  xa?: number;
  mins?: number;
  clean_sheet?: number;
  risk?: number;
  hype?: number;
  /** expected value for next GW */
  ev?: number;
};

export type PlayerWithScores = Player & {
  score?: ScoreObject;
  hype?: number;
  metrics?: ScoreObject;
};

export type Article = {
  id?: string;
  title: string;
  url: string;
  source?: string;
  published_at?: string; // ISO
  summary?: string;
  sentiment?: "pos" | "neu" | "neg" | string;
  teams?: string[];
  players?: string[];
};

// ===== Players =====

/** Consistent response shape from /players */
export async function listPlayers(
  position?: Position | string,
  params?: { q?: string; season?: string; limit?: number; offset?: number; team?: string }
): Promise<{ players: Player[]; total: number }> {
  const { data } = await api.get("/players", {
    params: { ...(position && position !== "ALL" ? { position } : {}), ...params },
  });

  // Normalize various possible backend shapes
  const raw = Array.isArray(data?.players) ? data.players : Array.isArray(data) ? data : [];
  const players: Player[] = raw.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name ?? `${p.first_name ?? ""} ${p.second_name ?? ""}`.trim()),
    team: String(p.team ?? p.team_name ?? ""),
    position: String(p.position ?? p.element_type_label ?? p.element_type)?.toUpperCase(),
    // accept `price_m`, `price`, or `now_cost` (tenths)
    price:
      p.price_m != null
        ? Number(p.price_m)
        : p.now_cost != null
        ? Number(p.now_cost) / 10
        : Number(p.price ?? 0),
  })) as Player[];

  const total = typeof data?.total === "number" ? data.total : players.length;
  return { players, total };
}

// ===== Optimization & Advice =====

export async function optimizeSquad(payload: {
  season: string;
  budget: number;
  exclude_players?: number[];
  lock_players?: number[];
}) {
  const { data } = await api.post("/optimize/squad", payload);
  return data;
}

export async function askAssistant(question: string, context?: any) {
  const { data } = await api.post("/assistant/ask", { question, context });
  return data;
}

export async function tradeAdvice(season: string, outId: number, inId: number) {
  const { data } = await api.post("/trades/advice", {
    season,
    out_player_id: outId,
    in_player_id: inId,
  });
  return data;
}

// ===== Scores / Table =====

/** Fetch players with attached scores if backend supports `include=`; falls back gracefully. */
export async function fetchScoreTable(params: {
  q?: string;
  position?: Position;
  team?: string;
  limit?: number;
  offset?: number;
  season?: string;
  order?: "name" | "price" | "score";
}) {
  const { data } = await api.get("/players", {
    params: { include: "score,hype,metrics", ...params },
  });

  const raw = Array.isArray(data?.players) ? data.players : Array.isArray(data) ? data : [];
  const players: PlayerWithScores[] = raw.map((p: any) => {
    const base: Player = {
      id: Number(p.id),
      name: String(p.name ?? `${p.first_name ?? ""} ${p.second_name ?? ""}`.trim()),
      team: String(p.team ?? p.team_name ?? ""),
      position: String(p.position ?? p.element_type_label ?? p.element_type).toUpperCase(),
      price:
        p.price_m != null
          ? Number(p.price_m)
          : p.now_cost != null
          ? Number(p.now_cost) / 10
          : Number(p.price ?? 0),
    } as Player;
    const score: ScoreObject =
      p.score || p.metrics || p.ScoreObject || (p?.scores ? p.scores : {}) || {};
    const hype = p.hype ?? score?.hype ?? undefined;
    return { ...base, score, hype, metrics: p.metrics };
  });

  return { players, total: data?.total ?? players.length };
}

// ===== News =====

/** News feed: try /news/feed, then /hype/news, else empty. */
export async function newsFeed(params: { q?: string; team?: string; limit?: number } = {}) {
  try {
    const { data } = await api.get("/news/feed", { params });
    return { articles: (data?.articles || data || []) as Article[] };
  } catch {
    try {
      const { data } = await api.get("/hype/news", { params });
      return { articles: (data?.articles || data || []) as Article[] };
    } catch {
      return { articles: [] as Article[] };
    }
  }
}

// ===== Uploads =====

/** Weekly scores CSV uploader. Supports both snake/kebab endpoints. */
export async function uploadWeeklyScores(file: File, season: string, gw: number) {
  const form = new FormData();
  form.append("file", file);
  form.append("season", season);
  form.append("gw", String(gw));
  try {
    const { data } = await api.post("/ingest/weekly_scores", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch {
    const { data } = await api.post("/ingest/weekly-scores", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
}

// ===== Squad summary =====

export async function squadSummary(payload: {
  season: string;
  budget: number;
  xi_ids: number[];
  bench_ids?: number[];
}) {
  const { data } = await api.post("/squad/summary", payload);
  return data as {
    value: number;
    in_bank: number;
    points_by_position: { GK: number; DEF: number; MID: number; FWD: number };
    mvp?: Player & { score?: number };
    similarity_pct: number;
    rank_history: number[];
  };
}

export default api;
