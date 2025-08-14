/// <reference types="vite/client" />

import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001'
})

export type Player = {
  id: number; name: string; team: string; position: 'GK'|'DEF'|'MID'|'FWD'; price: number
}

export async function listPlayers(position?: string) {
  const { data } = await api.get('/players', { params: position ? { position } : {} })
  return data.players as Player[]
}

export async function optimizeSquad(payload: { season: string; budget: number; exclude_players?: number[]; lock_players?: number[] }) {
  const { data } = await api.post('/optimize/squad', payload)
  return data
}

export async function askAssistant(question: string) {
  const { data } = await api.post('/assistant/ask', { question })
  return data
}

export async function tradeAdvice(season: string, outId: number, inId: number) {
  const { data } = await api.post('/trades/advice', { season, out_player_id: outId, in_player_id: inId })
  return data
}

export type Article = {
  id?: string;
  title: string;
  url: string;
  source?: string;
  published_at?: string; // ISO
  summary?: string;
  sentiment?: 'pos'|'neu'|'neg'|string;
  teams?: string[];
  players?: string[];
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
  ev?: number; // expected value for next GW
};

export type PlayerWithScores = Player & {
  score?: ScoreObject;
  hype?: number;
  metrics?: ScoreObject;
};

// ---- Assistant / Trades are already here: askAssistant, tradeAdvice ----

// Scores / Table: fetch players + attached score objects if backend provides them.
// Falls back to just players if the backend ignores include=...
export async function fetchScoreTable(params: {
  q?: string;
  position?: 'GK'|'DEF'|'MID'|'FWD'|'ALL';
  team?: string;
  limit?: number;
  offset?: number;
  season?: string;
  order?: 'name'|'price'|'score';
}) {
  const { data } = await api.get('/players', { params: { include: 'score,hype,metrics', ...params } });
  // normalize
  const players = (data?.players || data || []).map((p: any) => ({
    id: p.id, name: p.name, team: p.team, position: p.position, price: Number(p.price ?? 0),
    score: p.score || p.metrics || p.ScoreObject || {},
    hype: p.hype ?? p?.score?.hype ?? undefined,
  })) as PlayerWithScores[];
  return { players, total: data?.total ?? players.length };
}

// News feed: if /news/feed exists; otherwise tries /hype/news; otherwise returns empty.
export async function newsFeed(params: { q?: string; team?: string; limit?: number } = {}) {
  try {
    const { data } = await api.get('/news/feed', { params });
    const articles = (data?.articles || data || []) as Article[];
    return { articles };
  } catch {
    try {
      const { data } = await api.get('/hype/news', { params });
      const articles = (data?.articles || data || []) as Article[];
      return { articles };
    } catch {
      return { articles: [] as Article[] };
    }
  }
}

// Weekly scores uploader (CSV)
export async function uploadWeeklyScores(file: File, season: string, gw: number) {
  const form = new FormData();
  form.append('file', file);
  form.append('season', season);
  form.append('gw', String(gw));
  try {
    const { data } = await api.post('/ingest/weekly_scores', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (e) {
    const { data } = await api.post('/ingest/weekly-scores', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
}
