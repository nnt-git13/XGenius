# backend/app/services/players_csv.py
from __future__ import annotations
import csv, os, re
from typing import Dict, List, Tuple

# Map typical FPL encodings to our UI positions
POS_MAP_NUM_TO_STR = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
POS_ALLOWED = {"GK", "DEF", "MID", "FWD"}

def _to_float(x, default=0.0):
    try:
        if x is None or x == "":
            return float(default)
        # FPL often stores "now_cost" as integer tenths (e.g., 65 = £6.5m)
        v = float(x)
        return v
    except Exception:
        try:
            return float(str(x).strip().replace("£","").replace("m",""))
        except Exception:
            return float(default)

def _norm_price(row: Dict) -> float:
    # Try common columns and fallbacks
    if "price" in row:                  # already in millions
        return _to_float(row["price"])
    if "now_cost" in row:               # FPL tenths
        return _to_float(row["now_cost"]) / 10.0
    if "cost" in row:
        return _to_float(row["cost"])
    return 0.0

def _norm_name(row: Dict) -> str:
    for k in ("name","web_name","full_name","second_name","first_name"):
        if k in row and row[k]:
            return str(row[k]).strip()
    # Compose if only first/last exist
    fn = row.get("first_name") or row.get("firstName") or ""
    ln = row.get("second_name") or row.get("last_name") or row.get("lastName") or ""
    nm = f"{fn} {ln}".strip()
    return nm or "Unknown"

def _norm_team(row: Dict) -> str:
    for k in ("team","team_name","club","squad","short_team"):
        if k in row and row[k]:
            return str(row[k]).strip()
    # numeric team ids won’t help; leave as string id
    return str(row.get("team_id") or row.get("teamCode") or "Team")

def _norm_pos(row: Dict) -> str:
    # textual first
    for k in ("position","pos","element_type_str"):
        if k in row and row[k] and str(row[k]).upper() in POS_ALLOWED:
            return str(row[k]).upper()
    # numeric to string (FPL element_type)
    for k in ("element_type","pos_id","position_id"):
        if k in row and str(row[k]).isdigit():
            return POS_MAP_NUM_TO_STR.get(int(row[k]), "MID")
    return "MID"

def _norm_id(row: Dict) -> int:
    for k in ("id","player_id","element","code"):
        if k in row and str(row[k]).isdigit():
            return int(row[k])
    # fallback: hash of name+team+pos
    return abs(hash((_norm_name(row), _norm_team(row), _norm_pos(row)))) % 10_000_000

def _read_csv_rows(csv_path: str) -> List[Dict]:
    if not os.path.exists(csv_path):
        return []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)

def _best_csv_for_season(base_dir: str, season: str) -> str:
    """
    Choose a csv path. Prefers explicit matches like fpl_players_gw_data_24-25.csv,
    else falls back to app/players.csv.
    """
    # try season pattern
    pat = re.sub(r"[^0-9\-]", "", season or "")
    for name in os.listdir(base_dir):
        if name.lower().endswith(".csv") and pat and pat in name:
            return os.path.join(base_dir, name)
    # common default names
    for name in ("players.csv", "fpl_players_gw_data_24-25.csv"):
        p = os.path.join(base_dir, name)
        if os.path.exists(p):
            return p
    # last resort: first csv in dir
    for name in os.listdir(base_dir):
        if name.lower().endswith(".csv"):
            return os.path.join(base_dir, name)
    return os.path.join(base_dir, "players.csv")

def load_players_from_csv(season: str, base_dir: str) -> List[Dict]:
    csv_path = _best_csv_for_season(base_dir, season)
    rows = _read_csv_rows(csv_path)
    players: Dict[int, Dict] = {}
    for r in rows:
        pid = _norm_id(r)
        player = {
            "id": pid,
            "name": _norm_name(r),
            "team": _norm_team(r),
            "position": _norm_pos(r),
            "price": round(_norm_price(r), 1),
        }
        # de-duplicate: keep the latest/last occurrence
        players[pid] = player
    # return sorted by name
    return sorted(players.values(), key=lambda p: (p["position"], p["name"]))
