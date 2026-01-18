#!/usr/bin/env python3
"""
steam_playtime.py
------------------
Leest je Steam "owned games" via de meegegeven API-link, slaat ze lokaal op als JSON,
en toont/exporteert overzichten gesorteerd op totale speeltijd.

Standaard: elke run haalt de nieuwste data op en schrijft owned_games.json.
Gebruik --offline om de download te overslaan en alleen lokaal JSON te lezen.
"""
import argparse
import csv
import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

BASE_API_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"


def load_env(path: Optional[Path] = None) -> Dict[str, str]:

    env: Dict[str, str] = {}
    if path is None:
        path = Path(".env")
    try:
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    env[k] = v
    except Exception:
        # Silently ignore .env read issues; we'll rely on os.environ or error later when required
        pass

    merged: Dict[str, str] = {**env}
    for k in ("STEAM_API_KEY", "STEAM_ID_1", "STEAM_ID_2", "STEAM_ID_3"):
        if k in os.environ and not merged.get(k):
            merged[k] = os.environ.get(k, "")
    return merged


def build_api_url(api_key: str, steam_id: str) -> str:
    return f"{BASE_API_URL}?key={api_key}&steamid={steam_id}&include_appinfo=true"


def load_central_free_info(path: Path = Path("game_free_info.json")) -> Dict[
        int, Optional[bool]]:
    """Load centrally stored free-to-play info (appid -> is_free mapping)."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        # Convert string keys back to int
        return {int(k): v for k, v in data.items()}
    except Exception:
        return {}


def save_central_free_info(
    free_info: Dict[int, Optional[bool]],
    path: Path = Path("game_free_info.json")
) -> None:
    """Save free-to-play info centrally for all accounts."""
    try:
        # Convert int keys to strings for JSON
        data = {str(k): v for k, v in free_info.items()}
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    except Exception as e:
        print(f"⚠️  Kon centrale free-info niet opslaan: {e}")


def fetch_owned_games_json(api_url: str) -> Dict[str, Any]:
    try:
        req = Request(api_url,
                      headers={"User-Agent": "steam-playtime-script/1.0"})
        with urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise RuntimeError(f"HTTP {resp.status}")
            data = resp.read().decode("utf-8", errors="replace")
            return json.loads(data)
    except HTTPError as e:
        sys.exit(f"❌ HTTP-fout bij ophalen: {e.code} {e.reason}")
    except URLError as e:
        sys.exit(f"❌ Netwerkfout bij ophalen: {e.reason}")
    except json.JSONDecodeError as e:
        sys.exit(f"❌ Ongeldige JSON van API: {e}")
    except Exception as e:
        sys.exit(f"❌ Onbekende fout bij ophalen: {e}")


def save_json(data: Dict[str, Any], path: Path) -> None:
    try:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    except Exception as e:
        sys.exit(f"❌ Kon JSON niet schrijven naar {path}: {e}")


def load_games_from_json(path: Path) -> List[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(
            f"❌ JSON-bestand niet gevonden: {path}. Run zonder --offline om te downloaden."
        )
    except json.JSONDecodeError as e:
        sys.exit(f"❌ JSON parse-fout in {path}: {e}")
    games = data.get("response", {}).get("games", [])
    rows = []
    for g in games:
        rows.append({
            "appid":
            int(g.get("appid")) if g.get("appid") is not None else None,
            "name":
            g.get("name", ""),
            "minutes":
            int(g.get("playtime_forever", 0) or 0),
            "is_free":
            g.get("is_free", None),
        })
    return rows


def fetch_game_details(appid: int) -> Optional[bool]:
    """Fetch game details from Steam API to determine if it's free-to-play."""
    try:
        url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
        req = Request(url, headers={"User-Agent": "steam-playtime-script/1.0"})
        with urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8",
                                                     errors="replace"))
                if str(appid) in data:
                    return data[str(appid)].get("data",
                                                {}).get("is_free", None)
    except Exception:
        pass
    return None


def enrich_with_free_info(
        rows: List[Dict[str, Any]],
        central_free_info: Dict[int,
                                Optional[bool]]) -> Dict[int, Optional[bool]]:
    """Add free-to-play info to rows by querying Steam API if needed.
    
    Returns updated central_free_info dictionary with newly discovered info.
    """
    missing = [
        r for r in rows
        if r.get("is_free") is None and r["appid"] not in central_free_info
    ]

    # First apply existing central info
    for r in rows:
        if r.get("is_free") is None and r["appid"] in central_free_info:
            r["is_free"] = central_free_info[r["appid"]]

    if not missing:
        print("✅ Free-to-play info al beschikbaar (uit centrale cache)")
        return central_free_info

    print(
        f"🔍 {len(missing)} nieuwe games controleren op free-to-play status...")
    untested = []
    new_info = dict(central_free_info)

    for i, r in enumerate(missing, 1):
        is_free = fetch_game_details(r["appid"])
        if is_free is None:
            # Steam API geeft geen data (beta/test versies), markeer als untested
            untested.append(r["name"])
        r["is_free"] = is_free
        new_info[r["appid"]] = is_free
        if i % 10 == 0:
            print(f"  ... {i}/{len(missing)}")

    if untested:
        print(
            f"❓ {len(untested)} games konden niet worden geverifieerd (Untested):"
        )
        for name in untested[:5]:  # Toon max 5
            print(f"   - {name}")
        if len(untested) > 5:
            print(f"   ... en {len(untested)-5} meer")
    print("✅ Free-to-play info toegevoegd en opgeslagen in centrale cache")
    return new_info


def enrich_in_background(rows: List[Dict[str, Any]],
                         central_free_info: Dict[int, Optional[bool]]) -> None:
    """Background thread function to enrich free-to-play info without blocking.
    
    This silently updates the central free-info cache in the background.
    IMPORTANT: Only saves values that were successfully verified (not None).
    """
    missing = [
        r for r in rows
        if r.get("is_free") is None and r["appid"] not in central_free_info
    ]

    if not missing:
        return

    # Collect free-to-play info silently in background
    new_info = dict(central_free_info)
    for r in missing:
        is_free = fetch_game_details(r["appid"])
        # IMPORTANT: Only update if we got a definitive answer (not None)
        # If Steam API returns None, leave it as untested (None) in cache
        if is_free is not None:
            new_info[r["appid"]] = is_free

    # Save updated info
    save_central_free_info(new_info)


def filter_rows(rows: List[Dict[str, Any]],
                min_min: Optional[int],
                max_min: Optional[int],
                only_zero: bool,
                exclude_zero: bool,
                paid_only: bool = False,
                free_only: bool = False) -> List[Dict[str, Any]]:
    out = []
    for r in rows:
        m = r["minutes"]
        if only_zero and m != 0:
            continue
        if exclude_zero and m == 0:
            continue
        if min_min is not None and m < min_min:
            continue
        if max_min is not None and m > max_min:
            continue
        if paid_only and r.get("is_free") is True:
            continue
        if free_only and r.get("is_free") is not True:
            continue
        out.append(r)
    return out


def sort_rows(rows: List[Dict[str, Any]],
              ascending: bool) -> List[Dict[str, Any]]:
    return sorted(rows,
                  key=lambda r: (r["minutes"], r["name"].lower(), r["appid"]),
                  reverse=not ascending)


def print_table(rows: List[Dict[str, Any]], limit: Optional[int],
                show_hours: bool) -> None:
    try:
        from tabulate import tabulate  # type: ignore
    except Exception:
        tabulate = None

    headers = ["AppID", "Game", "Minutes"] + (["Hours"] if show_hours else [])
    to_show = rows[:limit] if limit else rows
    table = []
    for r in to_show:
        row = [r["appid"], r["name"], r["minutes"]]
        if show_hours:
            row.append(f"{r['minutes']/60:.2f}")
        table.append(row)
    if tabulate:
        fmt_headers = headers
        print(tabulate(table, headers=fmt_headers, tablefmt="github"))
    else:
        # simple fallback
        col1 = max(len("AppID"), *(len(str(x[0]))
                                   for x in table)) if table else len("AppID")
        col2 = max(len("Game"), *(len(str(x[1]))
                                  for x in table)) if table else len("Game")
        col3 = max(len("Minutes"), *(len(str(
            x[2])) for x in table)) if table else len("Minutes")
        if show_hours:
            col4 = max(len("Hours"), *(len(str(
                x[3])) for x in table)) if table else len("Hours")
            print(
                f"{'AppID':<{col1}}  {'Game':<{col2}}  {'Minutes':>{col3}}  {'Hours':>{col4}}"
            )
            print("-" * (col1 + col2 + col3 + col4 + 6))
            for x in table:
                print(
                    f"{str(x[0]):<{col1}}  {str(x[1]):<{col2}}  {str(x[2]):>{col3}}  {str(x[3]):>{col4}}"
                )
        else:
            print(f"{'AppID':<{col1}}  {'Game':<{col2}}  {'Minutes':>{col3}}")
            print("-" * (col1 + col2 + col3 + 4))
            for x in table:
                print(
                    f"{str(x[0]):<{col1}}  {str(x[1]):<{col2}}  {str(x[2]):>{col3}}"
                )


def export_csv(rows: List[Dict[str, Any]], path: Path) -> None:
    try:
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["appid", "name", "minutes", "hours"])
            for r in rows:
                w.writerow([
                    r["appid"], r["name"], r["minutes"],
                    f"{r['minutes']/60:.2f}"
                ])
        print(f"💾 CSV opgeslagen: {path}")
    except Exception as e:
        sys.exit(f"❌ Kon CSV niet schrijven: {e}")


def export_md(rows: List[Dict[str, Any]], path: Path, limit: Optional[int],
              show_hours: bool) -> None:
    to_show = rows[:limit] if limit else rows
    headers = ["AppID", "Game", "Minutes"] + (["Hours"] if show_hours else [])
    lines = [
        "|" + "|".join(headers) + "|",
        "|" + "|".join(["---"] * len(headers)) + "|"
    ]
    for r in to_show:
        row = [str(r["appid"]), r["name"], str(r["minutes"])]
        if show_hours:
            row.append(f"{r['minutes']/60:.2f}")
        lines.append("|" + "|".join(row) + "|")
    try:
        path.write_text("\n".join(lines), encoding="utf-8")
        print(f"📝 Markdown opgeslagen: {path}")
    except Exception as e:
        sys.exit(f"❌ Kon Markdown niet schrijven: {e}")


def ids_list(rows: List[Dict[str, Any]], n: int, sep: str) -> str:
    return sep.join(str(r["appid"]) for r in rows[:n])


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Toon/exporteer Steam games gesorteerd op speeltijd.")
    p.add_argument(
        "--api-url",
        default=None,
        help=
        "Volledige API-URL om JSON op te halen (override; normaal wordt URL uit .env opgebouwd)."
    )
    p.add_argument(
        "--env",
        default=None,
        help="Pad naar .env bestand (default: .env in huidige map).")
    p.add_argument(
        "--id",
        "-i",
        type=str,
        default=None,
        help=
        ("Steam ID selectie: geef '1', '2', of '3' voor vaste accounts uit .env (STEAM_ID_1..3), "
         "of geef een volledig numeriek SteamID. Zonder argument wordt account 1 gebruikt."
         ),
    )
    p.add_argument(
        "--output-json",
        default=None,
        help="Pad om JSON op te slaan (default: owned_games_{steamid}.json).")
    p.add_argument("--offline",
                   action="store_true",
                   help="Sla ophalen over en gebruik alleen lokaal JSON.")
    p.add_argument(
        "--sort-asc",
        action="store_true",
        help="Sorteer oplopend (minste minuten eerst). Standaard: aflopend.")
    p.add_argument("--top",
                   type=int,
                   default=None,
                   help="Toon/exporteer alleen top N rijen na sorteren.")
    p.add_argument("--show-hours",
                   action="store_true",
                   help="Voeg een Hours-kolom toe in tabel/exports.")
    p.add_argument("--csv",
                   default=None,
                   help="Exporteer naar CSV-bestand (pad).")
    p.add_argument("--md",
                   default=None,
                   help="Exporteer naar Markdown-bestand (pad).")
    p.add_argument(
        "--xlsx",
        default=None,
        help="Exporteer naar Excel-bestand (pad) – vereist openpyxl.")
    p.add_argument(
        "--top-ids",
        type=int,
        default=None,
        help=
        "Print de top N AppID's (meeste of minste afhankelijk van sortering).")
    p.add_argument(
        "--bottom-ids",
        type=int,
        default=None,
        help=
        "(Snelkoppeling) Print de N AppID's met minste minuten (negeert --sort-asc)."
    )
    p.add_argument("--ids-sep",
                   default=", ",
                   help="Scheidingsteken voor ID-lijsten (default: ', ').")
    p.add_argument("--min-minutes",
                   type=int,
                   default=None,
                   help="Filter: minimaal aantal minuten.")
    p.add_argument("--max-minutes",
                   type=int,
                   default=None,
                   help="Filter: maximaal aantal minuten.")
    p.add_argument("--only-zero",
                   action="store_true",
                   help="Filter: alleen games met 0 minuten.")
    p.add_argument("--exclude-zero",
                   action="store_true",
                   help="Filter: sluit games met 0 minuten uit.")
    p.add_argument(
        "--paid-only",
        action="store_true",
        help="Filter: alleen niet-gratis games (vereist free-to-play info).")
    p.add_argument(
        "--free-only",
        action="store_true",
        help="Filter: alleen gratis games (vereist free-to-play info).")
    p.add_argument("--enrich-free-info",
                   action="store_true",
                   help="Query Steam API voor free-to-play info en sla op.")
    return p.parse_args()


def maybe_export_xlsx(rows: List[Dict[str, Any]], path: Path,
                      show_hours: bool) -> None:
    if path is None:
        return
    try:
        import openpyxl  # type: ignore
        wb = openpyxl.Workbook()
        ws = wb.active
        if ws is None:
            sys.exit("❌ Kon geen actief werkblad maken in Excel bestand")
        ws.title = "Steam Playtime"
        headers = ["appid", "name", "minutes"
                   ] + (["hours"] if show_hours else [])
        ws.append(headers)
        for r in rows:
            row = [r["appid"], r["name"], r["minutes"]]
            if show_hours:
                row.append(round(r["minutes"] / 60.0, 2))
            ws.append(row)
        wb.save(path)
        print(f"📊 Excel opgeslagen: {path}")
    except ImportError:
        sys.exit(
            "❌ openpyxl niet geïnstalleerd. Installeer met: pip install openpyxl"
        )
    except Exception as e:
        sys.exit(f"❌ Kon Excel niet schrijven: {e}")


def main():
    args = parse_args()
    env_vars = load_env(Path(args.env) if args.env else None)

    def resolve_steam_id(id_arg: Optional[str],
                         env: Dict[str, str]) -> Optional[str]:
        """Return the Steam ID to use based on CLI arg or .env defaults.
        - None or empty -> STEAM_ID_1
        - '1'/'2'/'3' -> STEAM_ID_1/2/3
        - otherwise -> raw id_arg
        """
        if not id_arg:
            return env.get("STEAM_ID_1")
        s = str(id_arg).strip()
        if s in {"1", "2", "3"}:
            return env.get(f"STEAM_ID_{s}")
        return s

    # Determine Steam ID first for dynamic filename
    steam_id_str = None
    if not args.offline or args.output_json is None:
        if args.api_url:
            steam_id_str = None  # Can't extract from custom URL
        else:
            steam_id_str = resolve_steam_id(args.id, env_vars)
            if not steam_id_str and not args.offline:
                sys.exit(
                    "❌ Steam ID ontbreekt. Gebruik --id 1/2/3 of zet STEAM_ID_1 in .env."
                )

    # Set output path (dynamic based on Steam ID if not specified)
    if args.output_json:
        json_path = Path(args.output_json)
    elif steam_id_str:
        json_path = Path(f"owned_games_{steam_id_str}.json")
    else:
        json_path = Path("owned_games.json")

    # Load central free-to-play info (shared across all accounts)
    central_free_info = load_central_free_info()

    # 1) Download altijd nieuwste JSON tenzij --offline is gezet
    if not args.offline:
        # Bepaal API-URL: expliciete override, anders opbouwen uit .env
        if args.api_url:
            api_url = args.api_url
            steam_id_for_msg = None
        else:
            api_key = env_vars.get("STEAM_API_KEY")
            if not api_key:
                sys.exit(
                    "❌ STEAM_API_KEY ontbreekt. Zet deze in .env of als omgevingsvariabele."
                )
            if not steam_id_str:
                sys.exit(
                    "❌ Steam ID ontbreekt. Gebruik --id 1/2/3 of zet STEAM_ID_1 in .env."
                )
            api_url = build_api_url(api_key, steam_id_str)
            steam_id_for_msg = steam_id_str

        data = fetch_owned_games_json(api_url)
        # Apply central free-to-play info to downloaded data
        for game in data.get("response", {}).get("games", []):
            appid = game.get("appid")
            if appid in central_free_info:
                game["is_free"] = central_free_info[appid]
        save_json(data, json_path)
        if steam_id_for_msg:
            print(
                f"⬇️  JSON opgehaald voor SteamID {steam_id_for_msg} en opgeslagen naar: {json_path}"
            )
        else:
            print(f"⬇️  JSON opgehaald en opgeslagen naar: {json_path}")
    else:
        print("⚠️ Offline modus: oversla downloaden en lees lokaal JSON.")

    # 2) Inladen en voorbereiden
    rows = load_games_from_json(json_path)

    # Apply central free-info to rows
    for r in rows:
        if r.get("is_free") is None and r["appid"] in central_free_info:
            r["is_free"] = central_free_info[r["appid"]]

    # Enrich met free-to-play info
    if args.enrich_free_info:
        # Expliciete enrichment (altijd wachten)
        central_free_info = enrich_with_free_info(rows, central_free_info)
        save_central_free_info(central_free_info)
    else:
        # Check of we free-to-play info nodig hebben
        missing = [r for r in rows if r.get("is_free") is None]

        if (args.paid_only or args.free_only) and missing:
            # Filtering nodig maar data ontbreekt: doe expliciete enrichment (wacht)
            print("🔄 Free-to-play info verzamelen voor filtering...")
            central_free_info = enrich_with_free_info(rows, central_free_info)
            save_central_free_info(central_free_info)
        elif missing and not args.paid_only and not args.free_only:
            # Geen filtering: start achtergrond enrichment zonder te wachten
            print("🔄 Free-to-play info wordt op de achtergrond ingezameld...")
            bg_thread = threading.Thread(
                target=enrich_in_background,
                args=(rows, central_free_info),
                daemon=False)  # Non-daemon so it finishes
            bg_thread.start()
            # Give thread a moment to start, then continue
            time.sleep(0.1)

    # filters
    rows = filter_rows(rows, args.min_minutes, args.max_minutes,
                       args.only_zero, args.exclude_zero, args.paid_only,
                       args.free_only)

    # sorteren
    ascending = True if args.sort_asc else False
    rows_sorted = sort_rows(rows, ascending=ascending)

    # 3) Snelle ID-lijsten
    if args.bottom_ids is not None:
        # Altijd oplopend voor bottom
        smallest = sort_rows(rows, ascending=True)
        print(ids_list(smallest, args.bottom_ids, args.ids_sep))
        return
    if args.top_ids is not None:
        print(ids_list(rows_sorted, args.top_ids, args.ids_sep))
        return

    # 4) Tabel tonen in console
    print_table(rows_sorted, limit=args.top, show_hours=args.show_hours)

    # 5) Exports
    if args.csv:
        export_csv(rows_sorted[:args.top] if args.top else rows_sorted,
                   Path(args.csv))
    if args.md:
        export_md(rows_sorted,
                  Path(args.md),
                  limit=args.top,
                  show_hours=args.show_hours)
    if args.xlsx:
        maybe_export_xlsx(rows_sorted[:args.top] if args.top else rows_sorted,
                          Path(args.xlsx),
                          show_hours=args.show_hours)


if __name__ == "__main__":
    main()
