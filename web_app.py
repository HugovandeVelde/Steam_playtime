#!/usr/bin/env python3
"""
web_app.py
------------------
Flask web interface voor steam_playtime.py
Biedt een GUI om accounts te beheren, data op te halen en in te stellen.
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Set
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

from flask import Flask, render_template, request, jsonify, send_file
import threading
import time

# Import functies uit steam_playtime.py
import sys

sys.path.insert(0, str(Path(__file__).parent))

from steam_playtime import (load_env, save_central_free_info,
                            load_central_free_info, build_api_url,
                            fetch_owned_games_json, load_games_from_json,
                            enrich_with_free_info, filter_rows, sort_rows,
                            save_json, fetch_game_details)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['JSON_SORT_KEYS'] = False

ENV_FILE = Path(__file__).parent / ".env"
DATA_DIR = Path(__file__).parent
PROFILES_CACHE = Path(__file__).parent / "profiles_cache.json"
ACCOUNT_NOT_CONFIGURED = "Account niet geconfigureerd"
FETCH_REQUIRED = "Haal eerst data op"
API_KEY_NOT_SET = "API key niet ingesteld"

# Track background enrichment status per steam_id
_enrichment_status: Dict[str, Dict[str, Any]] = {}
_enrichment_lock = threading.Lock()
_fetch_all_lock = threading.Lock()
_fetch_all_status: Dict[str, Any] = {
    "status": "idle",
    "phase": "fetching",
    "current_account_index": 0,
    "total_accounts": 0,
    "current_steam_id": None,
    "completed_accounts": 0,
    "error_count": 0,
    "errors": [],
    "unknown_appids_total": 0,
    "message": ""
}


def set_enrichment_status(steam_id: str, status: str,
                          message: str = "") -> None:
    with _enrichment_lock:
        _enrichment_status[steam_id] = {
            "status": status,
            "started_at": time.time(),
            "message": message
        }


def get_enrichment_status(steam_id: str) -> Dict[str, Any]:
    with _enrichment_lock:
        return _enrichment_status.get(steam_id, {"status": "idle"})


def set_fetch_all_status(**kwargs) -> None:
    with _fetch_all_lock:
        _fetch_all_status.update(kwargs)
        _fetch_all_status["updated_at"] = time.time()


def replace_fetch_all_status(status: Dict[str, Any]) -> None:
    payload = {
        "status": "idle",
        "phase": "fetching",
        "current_account_index": 0,
        "total_accounts": 0,
        "current_steam_id": None,
        "completed_accounts": 0,
        "error_count": 0,
        "errors": [],
        "unknown_appids_total": 0,
        "message": "",
        **status,
        "updated_at": time.time()
    }
    with _fetch_all_lock:
        _fetch_all_status.clear()
        _fetch_all_status.update(payload)


def get_fetch_all_status() -> Dict[str, Any]:
    with _fetch_all_lock:
        return {
            **_fetch_all_status,
            "errors": [dict(err) for err in _fetch_all_status.get("errors", [])]
        }


def is_fetch_all_running() -> bool:
    with _fetch_all_lock:
        return _fetch_all_status.get("status") == "running"


def _update_per_account_file(json_path: Path,
                             free_info: Dict[int, Any]) -> None:
    """Update a per-account JSON file with the latest free/paid info."""
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        for game in data.get("response", {}).get("games", []):
            appid = game.get("appid")
            if appid in free_info and free_info[appid] is not None:
                game["is_free"] = free_info[appid]
        save_json(data, json_path)
    except Exception:
        pass


def get_env_config() -> Dict[str, str]:
    """Get current environment configuration."""
    return load_env(ENV_FILE)


def load_profiles_cache() -> Dict[str, Dict[str, Any]]:
    """Load cached profile information."""
    if PROFILES_CACHE.exists():
        try:
            return json.loads(PROFILES_CACHE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_profile_cache(profiles: Dict[str, Dict[str, Any]]) -> None:
    """Save profile information to cache."""
    try:
        PROFILES_CACHE.write_text(json.dumps(profiles,
                                             ensure_ascii=False,
                                             indent=2),
                                  encoding="utf-8")
    except IOError:
        pass  # Silently fail if cache can't be written


def update_profile_cache(steam_id: str, profile_info: Dict[str, Any]) -> None:
    """Update cache for a single Steam ID."""
    cache = load_profiles_cache()
    cache[steam_id] = profile_info
    save_profile_cache(cache)


def sort_free_info_cache() -> None:
    """Sort game_free_info.json by game ID (appid) in ascending order."""
    try:
        cache = load_central_free_info()
        if not cache:
            return

        # Sort by key (appid) numerically
        sorted_cache = dict(sorted(cache.items(), key=lambda x: int(x[0])))
        save_central_free_info(sorted_cache)
    except Exception:
        pass  # Silently fail if sorting fails


def save_env_config(config: Dict[str, str]) -> None:
    """Save environment configuration."""
    try:
        lines = []
        lines.append("# Steam Web API Key")
        lines.append(f"STEAM_API_KEY={config.get('STEAM_API_KEY', '')}")
        lines.append("")
        lines.append("# Steam account IDs (JSON array)")
        steam_accounts = config.get("STEAM_ACCOUNTS", "[]")
        lines.append(f"STEAM_ACCOUNTS={steam_accounts}")

        ENV_FILE.write_text("\n".join(lines), encoding="utf-8")
    except IOError as e:
        raise IOError(f"Kon .env niet opslaan: {e}") from e


def fetch_steam_profile(api_key: str, steam_id: str) -> Dict[str, Any]:
    """Fetch Steam profile info (name and avatar)."""
    try:
        profile_url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={api_key}&steamids={steam_id}"
        req = Request(profile_url,
                      headers={"User-Agent": "steam-playtime-script/1.0"})
        with urlopen(req, timeout=10) as resp:
            if resp.status != 200:
                return {"error": f"HTTP {resp.status}"}
            data = resp.read().decode("utf-8", errors="replace")
            result = json.loads(data)

            players = result.get("response", {}).get("players", [])
            if players:
                player = players[0]
                return {
                    "persona_name":
                    player.get("personaname", "Unknown"),
                    "avatar_url":
                    player.get("avatarfull", ""),
                    "profile_url":
                    player.get("profileurl", ""),
                    "community_visible":
                    player.get("communityvisibilitystate", 0) > 0
                }
            return {"error": "Player not found"}
    except Exception as e:
        return {"error": str(e)}


def _fetch_and_store_account_data(
        steam_id: str, api_key: str,
        central_free_info: Dict[int, Any]) -> Dict[str, Any]:
    """Fetch, cache, and save owned games for one account."""
    profile_info = fetch_steam_profile(api_key, steam_id)
    if "error" not in profile_info:
        update_profile_cache(steam_id, profile_info)

    api_url = build_api_url(api_key, steam_id)
    data = fetch_owned_games_json(api_url)

    unknown_appids: Set[int] = set()
    for game in data.get("response", {}).get("games", []):
        appid = game.get("appid")
        if appid is None:
            continue
        appid = int(appid)
        if appid in central_free_info:
            game["is_free"] = central_free_info[appid]
        else:
            unknown_appids.add(appid)

    json_path = DATA_DIR / f"owned_games_{steam_id}.json"
    save_json(data, json_path)

    return {
        "steam_id": steam_id,
        "json_path": json_path,
        "game_count": len(data.get("response", {}).get("games", [])),
        "unknown_count": len(unknown_appids),
        "unknown_appids": unknown_appids
    }


def _run_shared_enrichment(accounts_list: List[str],
                           central_free_info: Dict[int, Any],
                           unknown_appids: Set[int]) -> None:
    """Enrich free/paid info once for all newly discovered app IDs."""
    if not unknown_appids:
        return

    new_info = dict(central_free_info)
    for appid in sorted(unknown_appids):
        new_info[appid] = fetch_game_details(int(appid))

    save_central_free_info(new_info)
    sort_free_info_cache()

    for steam_id in accounts_list:
        json_file = DATA_DIR / f"owned_games_{steam_id}.json"
        _update_per_account_file(json_file, new_info)


@app.route('/')
def index():
    """Dashboard - toon accounts en overzicht."""
    config = get_env_config()
    accounts = {}
    profiles_cache = load_profiles_cache()

    # Parse dynamische accounts uit JSON
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Verzamel accounts met hun data (uit cache)
    for idx, steam_id in enumerate(accounts_list, 1):
        json_file = DATA_DIR / f"owned_games_{steam_id}.json"

        # Try to load from cache first
        cached_profile = profiles_cache.get(steam_id, {})

        accounts[idx] = {
            "steam_id": steam_id,
            "exists": json_file.exists(),
            "game_count": 0,
            "total_hours": 0,
            "persona_name": cached_profile.get("persona_name", "Unknown"),
            "avatar_url": cached_profile.get("avatar_url", "")
        }

        if json_file.exists():
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                games = data.get("response", {}).get("games", [])
                accounts[idx]["game_count"] = len(games)
                total_minutes = sum(
                    int(g.get("playtime_forever", 0) or 0) for g in games)
                accounts[idx]["total_hours"] = round(total_minutes / 60, 1)
            except (json.JSONDecodeError, IOError):
                pass

    return render_template('index.html',
                           accounts=accounts,
                           accounts_list=accounts_list,
                           api_key_set=bool(config.get("STEAM_API_KEY")))


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """Beheer instellingen."""
    if request.method == 'POST':
        data = request.get_json()
        config = get_env_config()

        # Update API key
        if "api_key" in data:
            config["STEAM_API_KEY"] = data["api_key"]

        # Update accounts list
        if "accounts" in data:
            config["STEAM_ACCOUNTS"] = json.dumps(data["accounts"],
                                                  ensure_ascii=False)

        try:
            save_env_config(config)
            return jsonify({
                "status": "success",
                "message": "Instellingen opgeslagen"
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 400

    # GET
    config = get_env_config()
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    return jsonify({
        "api_key": config.get("STEAM_API_KEY", ""),
        "accounts": accounts_list
    })


@app.route('/api/add-account', methods=['POST'])
def add_account():
    """Voeg een nieuw Steam account toe."""
    data = request.get_json()
    steam_id = data.get("steam_id", "").strip()

    # Validate Steam ID format (17 digits)
    if not steam_id or not steam_id.isdigit() or len(steam_id) != 17:
        return jsonify({"error":
                        "Ongeldig Steam ID. Moet 17 cijfers zijn."}), 400

    try:
        config = get_env_config()

        # Parse current accounts
        accounts_json = config.get("STEAM_ACCOUNTS", "[]")
        try:
            accounts_list = json.loads(accounts_json)
        except json.JSONDecodeError:
            accounts_list = []

        # Check if account already exists
        if steam_id in accounts_list:
            return jsonify({"error": "Account bestaat al"}), 400

        # Add new account
        accounts_list.append(steam_id)
        config["STEAM_ACCOUNTS"] = json.dumps(accounts_list,
                                              ensure_ascii=False)
        save_env_config(config)

        return jsonify({
            "status":
            "success",
            "message":
            f"✅ Account toegevoegd (totaal: {len(accounts_list)})"
        })

    except Exception as e:
        return jsonify({"error": f"Fout bij toevoegen: {str(e)}"}), 500


@app.route('/api/profile/<int:account_id>')
def get_account_profile(account_id: int):
    """Haal Steam profiel info op voor een account."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    steam_id = accounts_list[account_id - 1]
    api_key = config.get("STEAM_API_KEY")

    if not api_key:
        return jsonify({"error": API_KEY_NOT_SET}), 400

    profile_info = fetch_steam_profile(api_key, steam_id)

    # Save to cache if successful
    if "error" not in profile_info:
        update_profile_cache(steam_id, profile_info)

    return jsonify(profile_info)


@app.route('/api/profiles-all')
def get_all_profiles():
    """Haal profielinfo op voor ALLE accounts (batch)."""
    config = get_env_config()
    api_key = config.get("STEAM_API_KEY")

    if not api_key:
        return jsonify({"error": API_KEY_NOT_SET}), 400

    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    results = {}

    # Haal voor elk account de profielinfo op
    for idx, steam_id in enumerate(accounts_list, 1):
        profile_info = fetch_steam_profile(api_key, steam_id)

        if "error" not in profile_info:
            # Save to cache
            update_profile_cache(steam_id, profile_info)
            results[idx] = profile_info
        else:
            results[idx] = {
                "error": profile_info.get("error", "Unknown error")
            }

    return jsonify(results)


@app.route('/api/games/<int:account_id>')
def get_account_games(account_id: int):
    """Haal games op voor een specifiek account."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    steam_id = accounts_list[account_id - 1]
    json_file = DATA_DIR / f"owned_games_{steam_id}.json"

    if not json_file.exists():
        return jsonify({"error":
                        "Data nog niet opgehaald. Klik 'Ophalen'"}), 404

    try:
        rows = load_games_from_json(json_file)

        # Overlay latest central free info for most up-to-date status
        central_free_info = load_central_free_info()
        for r in rows:
            appid = r.get("appid")
            if appid in central_free_info:
                r["is_free"] = central_free_info[appid]

        # Query parameters voor filtering
        min_min = request.args.get('min_minutes', type=int)
        max_min = request.args.get('max_minutes', type=int)
        only_zero = request.args.get('only_zero', default=False, type=bool)
        exclude_zero = request.args.get('exclude_zero', default=False, type=bool)
        paid_only = request.args.get('paid_only', default=False, type=bool)
        free_only = request.args.get('free_only', default=False, type=bool)
        sort_asc = request.args.get('sort_asc', default=False, type=bool)
        limit = max(request.args.get('limit', type=int, default=200), 0)
        offset = max(request.args.get('offset', type=int, default=0), 0)

        # Filter
        filtered = filter_rows(rows, min_min, max_min, only_zero,
                               exclude_zero, paid_only, free_only)

        # Sort
        sorted_rows = sort_rows(filtered, ascending=sort_asc)

        # Aggregate totals before limiting so the user sees full-playtime sums
        total_minutes = sum(r.get("minutes", 0) for r in sorted_rows)
        total_hours = round(total_minutes / 60, 2)

        # Limit + offset (pagination)
        end_idx = offset + limit if limit else None
        result = sorted_rows[offset:end_idx]

        has_more = (offset + len(result)) < len(sorted_rows)

        return jsonify({
            "games": result,
            "total": len(sorted_rows),
            "offset": offset,
            "limit": limit,
            "has_more": has_more,
            "total_minutes": total_minutes,
            "total_hours": total_hours,
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/fetch/<int:account_id>', methods=['POST'])
def fetch_account_data(account_id: int):
    """Haal data op voor een account via de Steam API."""
    if is_fetch_all_running():
        return jsonify({"error": "Batch update is al bezig"}), 409

    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 400

    steam_id = accounts_list[account_id - 1]
    api_key = config.get("STEAM_API_KEY")

    if not api_key:
        return jsonify({"error": API_KEY_NOT_SET}), 400

    try:
        central_free_info = load_central_free_info()
        result = _fetch_and_store_account_data(steam_id, api_key,
                                               central_free_info)
        json_path = result["json_path"]
        game_count = result["game_count"]
        unknown_count = result["unknown_count"]

        # Auto-start enrichment in background if there are unknown games
        if unknown_count > 0:
            rows = load_games_from_json(json_path)

            def run_enrich():
                set_enrichment_status(
                    steam_id, "running",
                    f"{unknown_count} games worden gecontroleerd...")
                try:
                    new_info = enrich_with_free_info(rows, central_free_info)
                    save_central_free_info(new_info)
                    sort_free_info_cache()
                    _update_per_account_file(json_path, new_info)
                    set_enrichment_status(steam_id, "done",
                                         "Enrichment voltooid")
                except Exception as e:
                    set_enrichment_status(steam_id, "error", str(e))

            thread = threading.Thread(target=run_enrich, daemon=False)
            thread.start()

            return jsonify({
                "status": "success",
                "message":
                f"✅ {game_count} games opgehaald. 🔄 {unknown_count} onbekende games worden op de achtergrond ingezameld...",
                "game_count": game_count,
                "unknown_count": unknown_count,
                "steam_id": steam_id
            })

        return jsonify({
            "status": "success",
            "message":
            f"✅ {game_count} games opgehaald. Alle games zijn bekend!",
            "game_count": game_count,
            "unknown_count": 0,
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/fetch-all', methods=['POST'])
def fetch_all_accounts():
    """Fetch all configured accounts sequentially and enrich once."""
    if is_fetch_all_running():
        return jsonify({"error": "Batch update is al bezig"}), 409

    config = get_env_config()
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    if not accounts_list:
        return jsonify({"error": "Geen accounts ingesteld"}), 400

    api_key = config.get("STEAM_API_KEY")
    if not api_key:
        return jsonify({"error": API_KEY_NOT_SET}), 400

    replace_fetch_all_status({
        "status": "running",
        "phase": "fetching",
        "current_account_index": 0,
        "total_accounts": len(accounts_list),
        "current_steam_id": None,
        "completed_accounts": 0,
        "error_count": 0,
        "errors": [],
        "unknown_appids_total": 0,
        "message": "Batch update gestart"
    })

    def run_fetch_all():
        shared_unknown_appids: Set[int] = set()
        errors: List[Dict[str, Any]] = []
        try:
            central_free_info = load_central_free_info()

            for index, steam_id in enumerate(accounts_list, 1):
                set_fetch_all_status(
                    status="running",
                    phase="fetching",
                    current_account_index=index,
                    current_steam_id=steam_id,
                    message=f"Account {index}/{len(accounts_list)} ophalen..."
                )

                try:
                    result = _fetch_and_store_account_data(
                        steam_id, api_key, central_free_info)
                    shared_unknown_appids.update(result["unknown_appids"])
                except Exception as e:
                    errors.append({
                        "account_index": index,
                        "steam_id": steam_id,
                        "message": str(e)
                    })

                set_fetch_all_status(completed_accounts=index,
                                     error_count=len(errors),
                                     errors=list(errors),
                                     unknown_appids_total=len(
                                         shared_unknown_appids))

            set_fetch_all_status(phase="enriching",
                                 current_steam_id=None,
                                 current_account_index=len(accounts_list),
                                 message="Gezamenlijke verrijking uitvoeren...")

            _run_shared_enrichment(accounts_list, central_free_info,
                                   shared_unknown_appids)

            set_fetch_all_status(status="done",
                                 phase="finalizing",
                                 current_steam_id=None,
                                 completed_accounts=len(accounts_list),
                                 error_count=len(errors),
                                 errors=list(errors),
                                 unknown_appids_total=len(
                                     shared_unknown_appids),
                                 message="Batch update voltooid")
        except Exception as e:
            set_fetch_all_status(status="error",
                                 phase="finalizing",
                                 current_steam_id=None,
                                 error_count=len(errors),
                                 errors=list(errors),
                                 message=str(e))

    thread = threading.Thread(target=run_fetch_all, daemon=False)
    thread.start()

    return jsonify({
        "status": "started",
        "total_accounts": len(accounts_list),
        "message": f"Batch update gestart voor {len(accounts_list)} accounts"
    })


@app.route('/api/fetch-all-status')
def fetch_all_status():
    """Get the current fetch-all batch status."""
    return jsonify(get_fetch_all_status())


@app.route('/api/enrich/<int:account_id>', methods=['POST'])
def enrich_account_free_info(account_id: int):
    """Start free-to-play info enrichment voor account."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 400

    steam_id = accounts_list[account_id - 1]
    json_file = DATA_DIR / f"owned_games_{steam_id}.json"

    if not json_file.exists():
        return jsonify({"error": FETCH_REQUIRED}), 400

    try:
        rows = load_games_from_json(json_file)
        central_free_info = load_central_free_info()

        # Run enrichment (kan lang duren)
        def run_enrich():
            set_enrichment_status(steam_id, "running",
                                  "Free-to-play info wordt ingezameld...")
            try:
                new_info = enrich_with_free_info(rows, central_free_info)
                save_central_free_info(new_info)
                sort_free_info_cache()
                _update_per_account_file(json_file, new_info)
                set_enrichment_status(steam_id, "done",
                                     "Enrichment voltooid")
            except Exception as e:
                set_enrichment_status(steam_id, "error", str(e))

        thread = threading.Thread(target=run_enrich, daemon=False)
        thread.start()

        return jsonify({
            "status":
            "started",
            "message":
            "🔄 Free-to-play info wordt ingezameld. Dit kan enkele minuten duren...",
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/enrich-status/<steam_id>')
def enrich_status(steam_id: str):
    """Check enrichment status for a steam account."""
    status = get_enrichment_status(steam_id)
    return jsonify(status)


@app.route('/api/export/<int:account_id>/<format>')
def export_data(account_id: int, format: str):
    """Exporteer data als CSV of Excel."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    steam_id = accounts_list[account_id - 1]
    json_file = DATA_DIR / f"owned_games_{steam_id}.json"

    if not json_file.exists():
        return jsonify({"error": "Data niet gevonden"}), 404

    try:
        rows = load_games_from_json(json_file)

        if format == "csv":
            import csv
            import io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["appid", "name", "minutes", "hours"])
            for r in rows:
                writer.writerow([
                    r["appid"], r["name"], r["minutes"],
                    f"{r['minutes']/60:.2f}"
                ])

            output.seek(0)
            return output.getvalue(), 200, {
                'Content-Disposition':
                f'attachment; filename=games_{steam_id}.csv',
                'Content-Type': 'text/csv'
            }

        elif format == "json":
            export_file = DATA_DIR / f"games_export_{steam_id}.json"
            export_file.write_text(json.dumps(rows,
                                              ensure_ascii=False,
                                              indent=2),
                                   encoding="utf-8")
            return send_file(export_file,
                             as_attachment=True,
                             download_name=f"games_{steam_id}.json")

        else:
            return jsonify({"error": "Onbekend export format"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sort-cache', methods=['POST'])
def sort_cache():
    """Sorteer game_free_info.json op game ID."""
    try:
        sort_free_info_cache()
        return jsonify({
            "status": "success",
            "message": "✅ game_free_info.json gesorteerd op Game ID"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/untested-games/<int:account_id>')
def get_untested_games(account_id: int):
    """Haal untested games op voor een specifiek account."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    steam_id = accounts_list[account_id - 1]
    json_file = DATA_DIR / f"owned_games_{steam_id}.json"

    if not json_file.exists():
        return jsonify({"error": FETCH_REQUIRED}), 404

    try:
        rows = load_games_from_json(json_file)
        untested_games = [r for r in rows if r.get("is_free") is None]

        return jsonify({
            "games": untested_games,
            "count": len(untested_games),
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _update_game_in_files(accounts_list: List[str], appid: int,
                          is_free) -> int:
    """Update a game's free/paid status in all account files. Returns count of updated files."""
    updated_count = 0
    for steam_id in accounts_list:
        json_file = DATA_DIR / f"owned_games_{steam_id}.json"

        if not json_file.exists():
            continue

        try:
            game_data = json.loads(json_file.read_text(encoding="utf-8"))
            found = False

            for game in game_data.get("response", {}).get("games", []):
                if game.get("appid") == appid:
                    game["is_free"] = is_free
                    found = True
                    break

            if found:
                save_json(game_data, json_file)
                updated_count += 1
        except Exception:
            continue
    return updated_count


@app.route('/api/update-game-status/<int:account_id>', methods=['POST'])
def update_game_status(account_id: int):
    """Update the free/paid status of a game in all account files + central cache."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    try:
        data = request.get_json()
        appid = int(data.get("appid"))
        is_free = data.get("is_free")  # true, false, or null

        updated_count = _update_game_in_files(accounts_list, appid, is_free)

        # Update central cache
        central_free_info = load_central_free_info()
        central_free_info[appid] = is_free
        save_central_free_info(central_free_info)

        return jsonify({
            "status":
            "success",
            "message":
            f"✅ Game status geupdate ({updated_count} account(s))"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/retry-untested/<int:account_id>', methods=['POST'])
def retry_untested_games(account_id: int):
    """Retry checking untested games for a specific account."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    # Validate account ID
    if account_id < 1 or account_id > len(accounts_list):
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    steam_id = accounts_list[account_id - 1]
    json_file = DATA_DIR / f"owned_games_{steam_id}.json"

    if not json_file.exists():
        return jsonify({"error": FETCH_REQUIRED}), 400

    try:
        rows = load_games_from_json(json_file)
        untested_games = [r for r in rows if r.get("is_free") is None]

        if not untested_games:
            return jsonify({
                "status":
                "success",
                "message":
                "✅ Geen untested games om opnieuw te proberen"
            })

        central_free_info = load_central_free_info()

        # Run enrichment in background
        def run_enrich():
            set_enrichment_status(
                steam_id, "running",
                f"{len(untested_games)} untested games opnieuw controleren...")
            try:
                new_info = enrich_with_free_info(rows, central_free_info)
                save_central_free_info(new_info)
                sort_free_info_cache()
                _update_per_account_file(json_file, new_info)
                set_enrichment_status(steam_id, "done",
                                     "Retry voltooid")
            except Exception as e:
                set_enrichment_status(steam_id, "error", str(e))

        thread = threading.Thread(target=run_enrich, daemon=False)
        thread.start()

        return jsonify({
            "status":
            "started",
            "message":
            f"🔄 {len(untested_games)} untested games worden opnieuw gecontroleerd...",
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/untested-games-all')
def get_all_untested_games():
    """Haal alle untested games op van alle accounts, gesorteerd op appid."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    all_untested = []

    # Load central free info cache
    central_free_info = load_central_free_info()

    # Verzamel untested games van alle accounts
    for idx, account_id in enumerate(accounts_list, 1):
        json_file = DATA_DIR / f"owned_games_{account_id}.json"

        if not json_file.exists():
            continue

        try:
            rows = load_games_from_json(json_file)

            # Filter games that are untested in BOTH sources
            # A game is untested only if it's null in central cache AND null in the account file
            untested_games = []
            for r in rows:
                appid = int(r.get("appid", 0))  # Convert to int
                is_free_in_file = r.get("is_free")
                is_free_in_cache = central_free_info.get(appid)

                # Only mark as untested if both sources have null
                if is_free_in_file is None and is_free_in_cache is None:
                    untested_games.append(r)

            # Voeg account_id (1-based index) toe aan elk game object
            for game in untested_games:
                game["account_id"] = idx

            all_untested.extend(untested_games)
        except Exception:
            continue

    # Sorteer op appid (laag naar hoog)
    all_untested.sort(key=lambda x: x.get("appid", 0))

    return jsonify({"games": all_untested, "count": len(all_untested)})


@app.route('/api/retry-all-untested', methods=['POST'])
def retry_all_untested_games():
    """Retry checking all untested games from all accounts."""
    config = get_env_config()

    # Parse accounts list
    accounts_json = config.get("STEAM_ACCOUNTS", "[]")
    try:
        accounts_list = json.loads(accounts_json)
    except json.JSONDecodeError:
        accounts_list = []

    total_untested = 0

    def run_retry_all():
        """Background function to retry all untested games."""
        set_enrichment_status("__all__", "running",
                              "Alle untested games opnieuw scannen...")
        try:
            # Load central info
            central_free_info = load_central_free_info()

            # Get ALL untested appids from game_free_info.json (those with null value)
            untested_appids = {
                appid
                for appid, status in central_free_info.items()
                if status is None
            }

            if not untested_appids:
                set_enrichment_status("__all__", "done",
                                     "Geen untested games gevonden")
                return

            print(
                f"🔄 Retrying {len(untested_appids)} untested games from cache..."
            )

            # Now fetch details for each untested appid
            new_info = dict(central_free_info)
            untested_games = []

            for i, appid in enumerate(untested_appids, 1):
                is_free = fetch_game_details(int(appid))
                new_info[int(appid)] = is_free

                if is_free is None:
                    untested_games.append(appid)

                if i % 10 == 0:
                    print(f"  ... {i}/{len(untested_appids)}")

            print(
                f"✅ Retry complete: {len(untested_appids) - len(untested_games)} games verified"
            )

            # Save updated info
            save_central_free_info(new_info)
            sort_free_info_cache()

            # Now update all owned_games files with the new info
            print("📝 Updating owned_games files with new info...")
            for acct_id in accounts_list:
                json_file = DATA_DIR / f"owned_games_{acct_id}.json"
                _update_per_account_file(json_file, new_info)

            print("✅ All owned_games files updated")
            set_enrichment_status("__all__", "done",
                                 "Retry voltooid")
        except Exception as e:
            set_enrichment_status("__all__", "error", str(e))

    # Count untested games from central cache
    central_free_info = load_central_free_info()
    total_untested = len([v for v in central_free_info.values() if v is None])

    # Start background retry
    thread = threading.Thread(target=run_retry_all, daemon=False)
    thread.start()

    return jsonify({
        "status":
        "started",
        "message":
        f"🔄 {total_untested} untested games worden opnieuw gescanned. Dit kan enkele minuten duren..."
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
