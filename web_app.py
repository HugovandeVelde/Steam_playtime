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
from typing import Dict, Any, List

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
                            save_json)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['JSON_SORT_KEYS'] = False

ENV_FILE = Path(".env")
DATA_DIR = Path(".")
ACCOUNT_NOT_CONFIGURED = "Account niet geconfigureerd"


def get_env_config() -> Dict[str, str]:
    """Get current environment configuration."""
    return load_env(ENV_FILE)


def save_env_config(config: Dict[str, str]) -> None:
    """Save environment configuration."""
    try:
        lines = []
        lines.append("# Steam Web API Key")
        lines.append(f"STEAM_API_KEY={config.get('STEAM_API_KEY', '')}")
        lines.append("")
        lines.append("# Steam account IDs")
        lines.append(f"STEAM_ID_1={config.get('STEAM_ID_1', '')}")
        lines.append(f"STEAM_ID_2={config.get('STEAM_ID_2', '')}")
        lines.append(f"STEAM_ID_3={config.get('STEAM_ID_3', '')}")

        ENV_FILE.write_text("\n".join(lines), encoding="utf-8")
    except IOError as e:
        raise IOError(f"Kon .env niet opslaan: {e}") from e


@app.route('/')
def index():
    """Dashboard - toon accounts en overzicht."""
    config = get_env_config()
    accounts = {}

    # Verzamel accounts uit config
    for i in [1, 2, 3]:
        steam_id = config.get(f"STEAM_ID_{i}")
        if steam_id:
            json_file = DATA_DIR / f"owned_games_{steam_id}.json"
            accounts[i] = {
                "steam_id": steam_id,
                "exists": json_file.exists(),
                "game_count": 0
            }
            if json_file.exists():
                try:
                    data = json.loads(json_file.read_text(encoding="utf-8"))
                    accounts[i]["game_count"] = len(
                        data.get("response", {}).get("games", []))
                except (json.JSONDecodeError, IOError):
                    pass

    return render_template('index.html',
                           accounts=accounts,
                           api_key_set=bool(config.get("STEAM_API_KEY")))


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """Beheer instellingen."""
    if request.method == 'POST':
        data = request.get_json()
        config = get_env_config()

        # Update config
        if "api_key" in data:
            config["STEAM_API_KEY"] = data["api_key"]
        for i in [1, 2, 3]:
            key = f"steam_id_{i}"
            if key in data:
                config[f"STEAM_ID_{i}"] = data[key]

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
    return jsonify({
        "api_key": config.get("STEAM_API_KEY", ""),
        "steam_id_1": config.get("STEAM_ID_1", ""),
        "steam_id_2": config.get("STEAM_ID_2", ""),
        "steam_id_3": config.get("STEAM_ID_3", ""),
    })


@app.route('/api/games/<int:account_id>')
def get_account_games(account_id: int):
    """Haal games op voor een specifiek account."""
    config = get_env_config()
    steam_id = config.get(f"STEAM_ID_{account_id}")

    if not steam_id:
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

    json_file = DATA_DIR / f"owned_games_{steam_id}.json"
    if not json_file.exists():
        return jsonify({"error":
                        "Data nog niet opgehaald. Klik 'Ophalen'"}), 404

    try:
        rows = load_games_from_json(json_file)

        # Query parameters voor filtering
        min_min = request.args.get('min_minutes', type=int)
        max_min = request.args.get('max_minutes', type=int)
        only_zero = request.args.get('only_zero', type=bool)
        exclude_zero = request.args.get('exclude_zero', type=bool)
        paid_only = request.args.get('paid_only', type=bool)
        free_only = request.args.get('free_only', type=bool)
        sort_asc = request.args.get('sort_asc', type=bool)
        limit = request.args.get('limit', type=int, default=50)

        # Filter
        filtered = filter_rows(rows, min_min, max_min, only_zero or False,
                               exclude_zero or False, paid_only or False,
                               free_only or False)

        # Sort
        sorted_rows = sort_rows(filtered, ascending=sort_asc or False)

        # Limit
        result = sorted_rows[:limit] if limit else sorted_rows

        return jsonify({
            "games": result,
            "total": len(sorted_rows),
            "steam_id": steam_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/fetch/<int:account_id>', methods=['POST'])
def fetch_account_data(account_id: int):
    """Haal data op voor een account via de Steam API."""
    config = get_env_config()
    steam_id = config.get(f"STEAM_ID_{account_id}")
    api_key = config.get("STEAM_API_KEY")

    if not steam_id or not api_key:
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 400

    try:
        # Fetch data
        api_url = build_api_url(api_key, steam_id)
        data = fetch_owned_games_json(api_url)

        # Apply existing free-info
        central_free_info = load_central_free_info()
        for game in data.get("response", {}).get("games", []):
            appid = game.get("appid")
            if appid in central_free_info:
                game["is_free"] = central_free_info[appid]

        # Save
        json_path = DATA_DIR / f"owned_games_{steam_id}.json"
        save_json(data, json_path)

        game_count = len(data.get("response", {}).get("games", []))
        return jsonify({
            "status": "success",
            "message": f"✅ {game_count} games opgehaald",
            "game_count": game_count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enrich/<int:account_id>', methods=['POST'])
def enrich_account_free_info(account_id: int):
    """Start free-to-play info enrichment voor account."""
    config = get_env_config()
    steam_id = config.get(f"STEAM_ID_{account_id}")

    if not steam_id:
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 400

    json_file = DATA_DIR / f"owned_games_{steam_id}.json"
    if not json_file.exists():
        return jsonify({"error": "Haal eerst data op"}), 400

    try:
        rows = load_games_from_json(json_file)
        central_free_info = load_central_free_info()

        # Run enrichment (kan lang duren)
        def run_enrich():
            new_info = enrich_with_free_info(rows, central_free_info)
            save_central_free_info(new_info)

        thread = threading.Thread(target=run_enrich, daemon=False)
        thread.start()

        return jsonify({
            "status":
            "started",
            "message":
            "🔄 Free-to-play info wordt ingezameld. Dit kan enkele minuten duren..."
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/export/<int:account_id>/<format>')
def export_data(account_id: int, format: str):
    """Exporteer data als CSV of Excel."""
    config = get_env_config()
    steam_id = config.get(f"STEAM_ID_{account_id}")

    if not steam_id:
        return jsonify({"error": ACCOUNT_NOT_CONFIGURED}), 404

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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
