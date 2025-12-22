"""
Fetch official FPL/Premier League player photos and save them as player backgrounds.

This avoids scraping third-party sites (e.g., Getty/Google Images) and uses the same
FPL data source you're already ingesting.

Output:
  frontend/public/backgrounds/{fpl_element_id}.png   (or .jpg depending on source response)

Usage:
  cd backend
  export DATABASE_URL="sqlite:///./app/instance/xgenius.db"
  python scripts/fetch_player_backgrounds_fpl.py --out ../frontend/public/backgrounds --limit 200 --overwrite
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import httpx  # type: ignore


FPL_BOOTSTRAP = "https://fantasy.premierleague.com/api/bootstrap-static/"

# Known PL resource image size buckets (not all players have all sizes).
SIZE_BUCKETS = [
    "1024x1024",
    "768x768",
    "600x600",
    "500x500",
    "250x250",
    "110x140",
]


def _parse_sqlite_path(database_url: str) -> Path:
    if not database_url.startswith("sqlite:"):
        raise ValueError("Only sqlite DATABASE_URL is supported by this script.")
    p = database_url.replace("sqlite:///", "", 1)
    if p.startswith("/"):
        return Path(p)
    return (Path.cwd() / p).resolve()


@dataclass(frozen=True)
class PlayerRow:
    fpl_id: int
    name: str


def _iter_players(db_path: Path) -> Iterable[PlayerRow]:
    con = sqlite3.connect(str(db_path))
    try:
        cur = con.cursor()
        cur.execute("SELECT fpl_id, name FROM players WHERE fpl_id IS NOT NULL ORDER BY fpl_id")
        for fpl_id, name in cur.fetchall():
            if fpl_id is None:
                continue
            yield PlayerRow(int(fpl_id), str(name))
    finally:
        con.close()


async def _fetch_bootstrap() -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(FPL_BOOTSTRAP)
        r.raise_for_status()
        return r.json()


def _photo_id_from_element(el: dict) -> Optional[str]:
    # bootstrap-static elements have "photo": "12345.jpg"
    photo = el.get("photo")
    if not photo:
        return None
    return str(photo).split(".")[0].strip() or None


def _resource_urls(photo_id: str) -> list[str]:
    # Official PL resource base; try multiple size buckets.
    # Common pattern: https://resources.premierleague.com/premierleague/photos/players/{size}/p{photo_id}.png
    base = "https://resources.premierleague.com/premierleague/photos/players"
    urls: list[str] = []
    for size in SIZE_BUCKETS:
        urls.append(f"{base}/{size}/p{photo_id}.png")
        urls.append(f"{base}/{size}/p{photo_id}.jpg")
    return urls


async def _download_first(urls: list[str]) -> Optional[tuple[bytes, str]]:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for url in urls:
            try:
                r = await client.get(url, headers={"User-Agent": "XGenius/1.0"})
                if r.status_code != 200:
                    continue
                ct = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
                if not ct.startswith("image/"):
                    continue
                return r.content, ct
            except Exception:
                continue
    return None


def _ct_to_ext(ct: str) -> str:
    if ct == "image/png":
        return "png"
    if ct in ("image/jpeg", "image/jpg"):
        return "jpg"
    if ct == "image/webp":
        return "webp"
    if ct == "image/avif":
        return "avif"
    return "png"


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../frontend/public/backgrounds", help="Output directory (frontend public backgrounds)")
    ap.add_argument("--limit", type=int, default=0, help="Limit number of players (0 = all)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing files")
    ap.add_argument("--verbose", action="store_true", help="Print progress")
    args = ap.parse_args()

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise SystemExit("DATABASE_URL is required (sqlite:///...).")
    db_path = _parse_sqlite_path(database_url)
    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    bootstrap = await _fetch_bootstrap()
    elements = bootstrap.get("elements") or []
    el_by_id = {int(e["id"]): e for e in elements if e.get("id")}

    players = list(_iter_players(db_path))
    if args.limit and args.limit > 0:
        players = players[: args.limit]

    downloaded = 0
    skipped = 0
    missing = 0
    failed = 0

    for p in players:
        el = el_by_id.get(p.fpl_id)
        if not el:
            missing += 1
            if args.verbose:
                print(f"[miss] {p.fpl_id} {p.name} (not in bootstrap)")
            continue

        photo_id = _photo_id_from_element(el)
        if not photo_id:
            missing += 1
            if args.verbose:
                print(f"[miss] {p.fpl_id} {p.name} (no photo id)")
            continue

        # If any extension already exists, skip unless overwrite.
        existing = list(out_dir.glob(f"{p.fpl_id}.*"))
        if existing and not args.overwrite:
            skipped += 1
            if args.verbose:
                print(f"[skip] {p.fpl_id} {p.name} (exists)")
            continue

        res = await _download_first(_resource_urls(photo_id))
        if not res:
            failed += 1
            if args.verbose:
                print(f"[fail] {p.fpl_id} {p.name} (no resource match)")
            continue

        data, ct = res
        ext = _ct_to_ext(ct)
        out_path = out_dir / f"{p.fpl_id}.{ext}"
        try:
            out_path.write_bytes(data)
            downloaded += 1
            if args.verbose:
                print(f"[ok]   {p.fpl_id} {p.name} -> {out_path.name}")
        except Exception:
            failed += 1
            if args.verbose:
                print(f"[fail] {p.fpl_id} {p.name} (write error)")

    print(f"Done. players={len(players)} downloaded={downloaded} skipped={skipped} missing={missing} failed={failed} out={out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(__import__('asyncio').run(main()))


