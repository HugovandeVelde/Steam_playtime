# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

- Install deps: `pip install -r requirements.txt` (Flask, requests, openpyxl, tabulate). Note: the code actually uses `urllib.request`, not `requests`.
- Web UI: `python web_app.py` — binds to http://localhost:5000. The port is hardcoded in `__main__` (the README's `--port 5001` suggestion is wrong; there is no such flag).
- CLI: `python steam_playtime.py --id 1` (resolves `STEAM_ID_1` from `.env`), or `--id <17-digit-steamid>` for an arbitrary account. `--offline` skips the API call and reads the existing JSON.
- `--paid-only` / `--free-only` depend on the free-to-play cache. On a fresh checkout, run `python steam_playtime.py --enrich-free-info` once; it is slow (one `store.steampowered.com/api/appdetails` call per appid).
- SonarQube is the quality gate — `sonar-scanner` from the repo root reads `sonar-project.properties` and expects a local server at `localhost:9000`.
- There are no tests (no `tests/`, no pytest config). Don't invent a test command.

## Architecture

- `steam_playtime.py` is both the CLI entry point AND the shared library. `web_app.py` imports from it: `load_env`, `load_central_free_info`, `save_central_free_info`, `build_api_url`, `fetch_owned_games_json`, `load_games_from_json`, `enrich_with_free_info`, `filter_rows`, `sort_rows`, `save_json`, `fetch_game_details`. Changing any of these signatures ripples into the web app.
- Owned-games flow: Steam Web API → `fetch_owned_games_json` → `owned_games_{steamid}.json` → `load_games_from_json` (flattens to row dicts) → `filter_rows` → `sort_rows` → render/export.
- Free-to-play flow is a separate pipeline that hits `store.steampowered.com/api/appdetails` per appid via `fetch_game_details`, then merges results into the central cache `game_free_info.json`. The cache is shared across all accounts so each appid is only looked up once globally.
- `fetch-all` in the web UI fetches every account first, then runs a single shared enrichment pass (`_run_shared_enrichment`). Don't enrich per-account inside the batch loop — that's what the shared pass avoids.

## Data files

- `.env` holds `STEAM_API_KEY` plus **either** `STEAM_ACCOUNTS=[...]` (JSON array of Steam64 IDs, written by the web UI) **or** legacy `STEAM_ID_1/2/3` (read only by `resolve_steam_id` in the CLI). Both can coexist; the CLI does not read `STEAM_ACCOUNTS`, so accounts added via the web UI aren't reachable through `--id 1/2/3` unless also mirrored into `STEAM_ID_*` — pass the raw Steam64 ID to `--id` instead.
- `owned_games_{steam_id}.json` — per account; the raw Steam `GetOwnedGames` response, with each game augmented by a top-level `is_free` boolean copied from the central cache.
- `game_free_info.json` — central `{appid: true | false | null}` map. `null` means "checked, but Steam didn't return `is_free`" — this is the "Untested" bucket in the UI, not "unchecked". This is the only `*.json` that is explicitly un-gitignored (see `.gitignore`).
- `profiles_cache.json` — Steam persona/avatar cache, maintained by `update_profile_cache`.
- All other `*.json` files are gitignored.

## Conventions

- Code comments, docstrings, and API JSON `message` strings are in **Dutch**. Keep that convention when editing — don't silently translate existing Dutch to English.
- Frontend strings live in a `TRANSLATIONS` map (`nl` / `en`) in `static/app.js`; templates reference them via `data-i18n` / `data-i18n-placeholder` attributes. When adding UI text, add both locales.
- Background threads in `web_app.py` (`run_enrich`, `run_fetch_all`, `run_retry_all`) are `daemon=False` on purpose — they must finish updating caches after the HTTP response returns. Don't switch them to `daemon=True`.
- The shared status dicts `_enrichment_status` and `_fetch_all_status` are guarded by `_enrichment_lock` and `_fetch_all_lock`. Read/write them through the `set_*_status` / `get_*_status` / `replace_fetch_all_status` helpers, not directly.
