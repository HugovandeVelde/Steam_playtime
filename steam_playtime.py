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
import socket
import sys
import threading
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

BASE_API_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"

FREE_INFO_PATH = Path(__file__).parent / "game_free_info.json"

# Storefront API throttling: ~200 requests / 5 minuten per IP.
# 1.5s baseline houdt ons net onder die limiet zonder de UI te lang te blokkeren.
STORE_API_DELAY = 1.5
_STORE_RETRY_BACKOFFS = (2.0, 5.0, 15.0)


class SteamRateLimited(Exception):
    """Raised wanneer de Steam-storefront ons na meerdere retries blijft throttlen."""


def _parse_env_file(path: Path) -> Dict[str, str]:
    """Parse a .env file into a dict, silently ignoring errors."""
    env: Dict[str, str] = {}
    try:
        if not path.exists():
            return env
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    except Exception:
        pass
    return env


def load_env(path: Optional[Path] = None) -> Dict[str, str]:
    env = _parse_env_file(path or Path(".env"))
    merged: Dict[str, str] = {**env}
    for k in ("STEAM_API_KEY", "STEAM_ID_1", "STEAM_ID_2", "STEAM_ID_3"):
        if k in os.environ and not merged.get(k):
            merged[k] = os.environ.get(k, "")
    return merged


def build_api_url(api_key: str, steam_id: str) -> str:
    """Build Steam GetOwnedGames URL including free games and app info."""
    return (f"{BASE_API_URL}?key={api_key}&steamid={steam_id}"
            "&include_appinfo=true"
            "&include_played_free_games=true"
            "&include_free_sub=true")


def load_central_free_info(path: Path = FREE_INFO_PATH) -> Dict[
        int, Optional[bool]]:
    """Load centrally stored free-to-play info (appid -> is_free mapping)."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {int(k): v for k, v in data.items()}
    except Exception:
        return {}


def save_central_free_info(
    free_info: Dict[int, Optional[bool]],
    path: Path = FREE_INFO_PATH
) -> None:
    """Save free-to-play info centrally for all accounts.

    Schrijft eerst naar een tijdelijk bestand en doet dan os.replace, zodat
    een crash midden in een schrijfactie nooit het centrale cachebestand
    kan halveren. Belangrijk omdat saves nu ook tijdens lange enrichment-
    loops gebeuren, niet alleen aan het einde.
    """
    try:
        data = {str(k): v for k, v in free_info.items()}
        tmp_path = path.parent / (path.name + ".tmp")
        tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                            encoding="utf-8")
        os.replace(tmp_path, path)
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


def _parse_retry_after(header_value: Optional[str]) -> Optional[float]:
    """Lees een Retry-After header (seconden of HTTP-date) uit; geef None bij parse-fout."""
    if not header_value:
        return None
    try:
        return float(header_value)
    except (TypeError, ValueError):
        return None


def fetch_game_details(appid: int) -> Optional[bool]:
    """Bepaal of een appid free-to-play is via de publieke storefront-API.

    Retourneert True/False bij succes, None als Steam wel antwoordt maar geen
    is_free veld heeft (echt 'unknown'). Een appid waarvoor Steam expliciet
    success=false geeft (verwijderd/onzichtbaar in de store) wordt als free
    geclassificeerd — die kun je toch niet meer kopen. Gooit SteamRateLimited
    als we na meerdere retries nog steeds throttled worden — zo kan de
    aanroeper de cache met rust laten in plaats van per ongeluk null te
    schrijven.
    """
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    last_rate_limited = False

    for attempt in range(len(_STORE_RETRY_BACKOFFS) + 1):
        try:
            req = Request(url,
                          headers={"User-Agent": "steam-playtime-script/1.0"})
            with urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    payload = json.loads(
                        resp.read().decode("utf-8", errors="replace"))
                    entry = payload.get(str(appid), {})
                    if entry.get("success") is False:
                        # Niet meer in de store: behandel als free.
                        return True
                    return entry.get("data", {}).get("is_free", None)
                if resp.status in (429, 500, 502, 503, 504):
                    last_rate_limited = resp.status == 429
                else:
                    return None
        except HTTPError as e:
            if e.code == 429 or 500 <= e.code < 600:
                last_rate_limited = e.code == 429
                retry_after = _parse_retry_after(
                    e.headers.get("Retry-After") if e.headers else None)
                if attempt < len(_STORE_RETRY_BACKOFFS):
                    delay = retry_after if retry_after is not None else \
                        _STORE_RETRY_BACKOFFS[attempt]
                    print(
                        f"⏳ Storefront throttled (HTTP {e.code}) voor appid "
                        f"{appid}, wacht {delay:.1f}s en probeer opnieuw...")
                    time.sleep(delay)
                    continue
            else:
                return None
        except (URLError, socket.timeout, TimeoutError):
            if attempt < len(_STORE_RETRY_BACKOFFS):
                time.sleep(_STORE_RETRY_BACKOFFS[attempt])
                continue
            return None
        except (json.JSONDecodeError, ValueError):
            return None

        if attempt < len(_STORE_RETRY_BACKOFFS):
            time.sleep(_STORE_RETRY_BACKOFFS[attempt])

    if last_rate_limited:
        raise SteamRateLimited(f"Storefront blijft 429 geven voor appid {appid}")
    return None


def _report_untested(untested: List[str]) -> None:
    """Print a summary of games that couldn't be verified for free-to-play status."""
    if not untested:
        return
    print(
        f"❓ {len(untested)} games konden niet worden geverifieerd (Untested):"
    )
    for name in untested[:5]:
        print(f"   - {name}")
    if len(untested) > 5:
        print(f"   ... en {len(untested)-5} meer")


def enrich_with_free_info(
    rows: List[Dict[str, Any]],
    central_free_info: Dict[int, Optional[bool]],
) -> tuple[Dict[int, Optional[bool]], bool]:
    """Add free-to-play info to rows by querying Steam API if needed.

    Returns (updated central_free_info, rate_limited) — `rate_limited` is True
    als de loop voortijdig stopte omdat de Steam-storefront ons throttelde.
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
        return central_free_info, False

    print(
        f"🔍 {len(missing)} nieuwe games controleren op free-to-play status...")
    untested = []
    new_info = dict(central_free_info)
    rate_limited = False

    for i, r in enumerate(missing, 1):
        try:
            is_free = fetch_game_details(r["appid"])
        except SteamRateLimited:
            # Schrijf NIET naar new_info — appid blijft uncached zodat
            # een latere run hem opnieuw probeert in plaats van als 'Untested'.
            rate_limited = True
            print(
                "⛔ Storefront blijft throttlen, stop verrijking met "
                f"{i-1}/{len(missing)} verwerkt. Probeer later opnieuw.")
            # Persist al gedane lookups voordat we returnen, anders gaat
            # de tussenstand verloren bij een onderbreking.
            save_central_free_info(new_info)
            break
        if is_free is None:
            untested.append(r["name"])
        r["is_free"] = is_free
        new_info[r["appid"]] = is_free
        if i % 10 == 0:
            print(f"  ... {i}/{len(missing)}")
            # Flush tussenstand naar disk zodat een latere run niet
            # opnieuw alle al-opgehaalde appids hoeft te lookup'en.
            save_central_free_info(new_info)
        if i < len(missing):
            time.sleep(STORE_API_DELAY)

    _report_untested(untested)
    if rate_limited:
        print("⚠️  Verrijking gedeeltelijk voltooid wegens rate limiting.")
    else:
        print("✅ Free-to-play info toegevoegd en opgeslagen in centrale cache")
    return new_info, rate_limited


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
    for i, r in enumerate(missing):
        try:
            is_free = fetch_game_details(r["appid"])
        except SteamRateLimited:
            # Stop stilletjes; appid blijft uncached voor een latere poging.
            # Wel eerst de al gedane lookups persisteren.
            save_central_free_info(new_info)
            break
        # IMPORTANT: Mark ALL games (tested and untested) in central cache
        # So we can track which games were checked
        if is_free is not None:
            new_info[r["appid"]] = is_free
        else:
            # Mark as untested (None) so we know it was checked but couldn't be verified
            new_info[r["appid"]] = None
        if (i + 1) % 10 == 0:
            # Flush tussenstand zodat bij een crash/restart de al opgehaalde
            # appids niet opnieuw bevraagd hoeven te worden.
            save_central_free_info(new_info)
        if i + 1 < len(missing):
            time.sleep(STORE_API_DELAY)

    # Save updated info (vangt ook de staart van <10 games op).
    save_central_free_info(new_info)


def _row_passes_filter(r: Dict[str, Any],
                       min_min: Optional[int],
                       max_min: Optional[int],
                       only_zero: bool,
                       exclude_zero: bool,
                       paid_only: bool,
                       free_only: bool) -> bool:
    """Check whether a single game row passes all filter criteria."""
    m = r["minutes"]
    if only_zero and m != 0:
        return False
    if exclude_zero and m == 0:
        return False
    if min_min is not None and m < min_min:
        return False
    if max_min is not None and m > max_min:
        return False
    if paid_only and r.get("is_free") is True:
        return False
    if free_only and r.get("is_free") is not True:
        return False
    return True


def filter_rows(rows: List[Dict[str, Any]],
                min_min: Optional[int],
                max_min: Optional[int],
                only_zero: bool,
                exclude_zero: bool,
                paid_only: bool = False,
                free_only: bool = False) -> List[Dict[str, Any]]:
    return [r for r in rows
            if _row_passes_filter(r, min_min, max_min, only_zero,
                                  exclude_zero, paid_only, free_only)]


def sort_rows(rows: List[Dict[str, Any]],
              ascending: bool) -> List[Dict[str, Any]]:
    return sorted(rows,
                  key=lambda r: (r["minutes"], r["name"].lower(), r["appid"]),
                  reverse=not ascending)


def _print_table_simple(table: List[list], show_hours: bool) -> None:
    """Print a simple text table without the tabulate library."""
    col1 = max(len("AppID"), *(len(str(x[0])) for x in table)) if table else len("AppID")
    col2 = max(len("Game"), *(len(str(x[1])) for x in table)) if table else len("Game")
    col3 = max(len("Minutes"), *(len(str(x[2])) for x in table)) if table else len("Minutes")
    if show_hours:
        col4 = max(len("Hours"), *(len(str(x[3])) for x in table)) if table else len("Hours")
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
        print(tabulate(table, headers=headers, tablefmt="github"))
    else:
        _print_table_simple(table, show_hours)


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


def _determine_paths(args: argparse.Namespace,
                     env_vars: Dict[str, str]) -> tuple:
    """Determine steam_id_str and json_path from args and env."""
    steam_id_str = None
    if (not args.offline or args.output_json is None) and not args.api_url:
        steam_id_str = resolve_steam_id(args.id, env_vars)
        if not steam_id_str and not args.offline:
            sys.exit(
                "❌ Steam ID ontbreekt. Gebruik --id 1/2/3 of zet STEAM_ID_1 in .env."
            )

    if args.output_json:
        json_path = Path(args.output_json)
    elif steam_id_str:
        json_path = Path(f"owned_games_{steam_id_str}.json")
    else:
        json_path = Path("owned_games.json")

    return steam_id_str, json_path


def _download_and_save(args: argparse.Namespace,
                       env_vars: Dict[str, str],
                       steam_id_str: Optional[str],
                       central_free_info: Dict[int, Optional[bool]],
                       json_path: Path) -> None:
    """Download games from Steam API and save to JSON."""
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


def _handle_enrichment(args: argparse.Namespace,
                       rows: List[Dict[str, Any]],
                       central_free_info: Dict[int, Optional[bool]]) -> Dict[
                           int, Optional[bool]]:
    """Handle free-to-play enrichment based on args."""
    if args.enrich_free_info:
        central_free_info, _ = enrich_with_free_info(rows, central_free_info)
        save_central_free_info(central_free_info)
        return central_free_info

    missing = [r for r in rows if r.get("is_free") is None]
    if (args.paid_only or args.free_only) and missing:
        # Filtering nodig maar data ontbreekt: doe expliciete enrichment (wacht)
        print("🔄 Free-to-play info verzamelen voor filtering...")
        central_free_info, _ = enrich_with_free_info(rows, central_free_info)
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
    return central_free_info


def _handle_exports(args: argparse.Namespace,
                    rows_sorted: List[Dict[str, Any]]) -> None:
    """Handle CSV, Markdown, and Excel exports."""
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


def main():
    args = parse_args()
    env_vars = load_env(Path(args.env) if args.env else None)

    steam_id_str, json_path = _determine_paths(args, env_vars)
    central_free_info = load_central_free_info()

    # 1) Download nieuwste JSON tenzij --offline
    if not args.offline:
        _download_and_save(args, env_vars, steam_id_str, central_free_info,
                           json_path)
    else:
        print("⚠️ Offline modus: oversla downloaden en lees lokaal JSON.")

    # 2) Inladen en voorbereiden
    rows = load_games_from_json(json_path)

    # Apply central free-info to rows
    for r in rows:
        if r.get("is_free") is None and r["appid"] in central_free_info:
            r["is_free"] = central_free_info[r["appid"]]

    # Enrich met free-to-play info
    central_free_info = _handle_enrichment(args, rows, central_free_info)

    # filters + sorteren
    rows = filter_rows(rows, args.min_minutes, args.max_minutes,
                       args.only_zero, args.exclude_zero, args.paid_only,
                       args.free_only)
    rows_sorted = sort_rows(rows, ascending=args.sort_asc)

    # 3) Snelle ID-lijsten
    if args.bottom_ids is not None:
        print(ids_list(sort_rows(rows, ascending=True), args.bottom_ids,
                       args.ids_sep))
        return
    if args.top_ids is not None:
        print(ids_list(rows_sorted, args.top_ids, args.ids_sep))
        return

    # 4) Tabel tonen in console
    print_table(rows_sorted, limit=args.top, show_hours=args.show_hours)

    # 5) Exports
    _handle_exports(args, rows_sorted)


if __name__ == "__main__":
    main()
