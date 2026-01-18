# steam_playtime.py

Een simpele tool om je **Steam owned games** op te halen, lokaal op te slaan en te sorteren op **totale speeltijd**.  
Standaard wordt bij **iedere run** de meest recente data opgehaald via de Steam API en opgeslagen als `owned_games_{steamid}.json`.

## ✨ Nieuwe features

- **🔐 .env configuratie**: API key en meerdere Steam accounts in `.env` bestand
- **👥 Multi-account support**: Schakel eenvoudig tussen maximaal 3 vaste accounts of gebruik elk Steam ID
- **💾 Centrale free-to-play cache**: Free-to-play info wordt gedeeld tussen alle accounts in `game_free_info.json`
- **📁 Automatische bestandsnamen**: Elk account krijgt z'n eigen JSON (`owned_games_76561198415456165.json`)

## Installatie

```bash
# (optioneel) Maak een virtualenv
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Vereisten voor extra exports (optioneel)
pip install tabulate openpyxl
```

## Configuratie

Maak een `.env` bestand in dezelfde map als het script:

```ini
# Steam Web API Key (krijg je op https://steamcommunity.com/dev/apikey)
STEAM_API_KEY=jouw_api_key_hier

# Standaard accounts (optioneel: 1-3 accounts)
STEAM_ID_1=76561198415456165
STEAM_ID_2=76561198033137905
STEAM_ID_3=

```

## Gebruik

### Account selectie

```bash
# Account 1 (default, geen --id nodig)
python steam_playtime.py

# Specifiek account uit .env (1, 2 of 3)
python steam_playtime.py --id 1
python steam_playtime.py --id 2

# Elk willekeurig Steam ID
python steam_playtime.py --id 76561198033137905
```

### Basis commando's

```bash
# Basis: download nieuwste JSON en toon tabel (meest gespeeld bovenaan)
python steam_playtime.py

# Minst gespeelde eerst
python steam_playtime.py --sort-asc

# Top/bottom ID-lijsten (komma-gescheiden)
python steam_playtime.py --top-ids 30
python steam_playtime.py --bottom-ids 30
```

### Filters

```bash
# Alleen games met 0 minuten, of sluit 0 minuten uit
python steam_playtime.py --only-zero
python steam_playtime.py --exclude-zero

# Minuten-range filter
python steam_playtime.py --min-minutes 1 --max-minutes 600  # 1 t/m 600 min
```

### Free-to-play filters

**💡 Belangrijk**: Free-to-play info wordt **eenmalig** verzameld en opgeslagen in `game_free_info.json`. Deze wordt gedeeld tussen alle accounts, dus je hoeft dit maar één keer te doen!

```bash
# Eenmalig: verzamel free-to-play info (duurt ~2 min voor 600 games)
python steam_playtime.py --enrich-free-info

# Nu kun je filteren voor elk account zonder opnieuw te enrichen:
python steam_playtime.py --id 1 --paid-only --sort-asc --top 30  # Top 30 minst gespeelde betaalde games
python steam_playtime.py --id 2 --free-only                       # Alleen gratis games van account 2
python steam_playtime.py --id 3 --paid-only                       # Alleen betaalde games van account 3
```

### Weergave & exports

```bash
# Alleen top N in de tabel tonen
python steam_playtime.py --top 25

# Voeg Hours kolom toe
python steam_playtime.py --show-hours

# Exporteer naar verschillende formaten
python steam_playtime.py --csv playtime.csv
python steam_playtime.py --md playtime.md --show-hours
python steam_playtime.py --xlsx playtime.xlsx
```

### Offline modus

```bash
# Gebruik lokale JSON zonder opnieuw te downloaden
python steam_playtime.py --offline --id 1  # Leest owned_games_76561198415456165.json
python steam_playtime.py --offline --id 2  # Leest owned_games_76561198033137905.json
```

## Gedrag & flags

### Automatisch updaten
Standaard haalt de tool **altijd** de nieuwste data op van de Steam API en slaat dit op als `owned_games_{steamid}.json` (bijv. `owned_games_76561198415456165.json`).

### Bestandsbeheer
- **Per-account JSON**: Elk Steam ID krijgt z'n eigen JSON-bestand
- **Centrale free-info cache**: `game_free_info.json` deelt free-to-play info tussen alle accounts
- **Offline werken**: Gebruik `--offline` om de download over te slaan en lokale JSON te lezen

### Account selectie (`--id`)
- Geen argument: gebruikt `STEAM_ID_1` uit `.env`
- `--id 1/2/3`: gebruikt `STEAM_ID_1/2/3` uit `.env`
- `--id 76561198...`: gebruikt dit specifieke Steam ID

### Sortering
- Standaard **aflopend** (meeste minuten eerst)
- `--sort-asc` zet **oplopend** (minste minuten eerst)

### ID-lijsten
- `--top-ids N`: print de top N AppID's volgens de huidige sortering (respecteert `--sort-asc`)
- `--bottom-ids N`: print altijd de N **minste** (negeert `--sort-asc`)
- `--ids-sep " | "`: wijzig het scheidingsteken (default: `", "`)

### Filtering
- `--only-zero`: alleen games met **0** minuten
- `--exclude-zero`: sluit games met **0** minuten uit
- `--min-minutes X` / `--max-minutes Y`: filter op bereik
- `--paid-only`: alleen **niet-gratis** games (vereist free-to-play info)
- `--free-only`: alleen **gratis** games (vereist free-to-play info)
- `--enrich-free-info`: query Steam API voor free-to-play status en sla centraal op

### Weergave & export
- `--top N`: beperk het aantal weergegeven/geëxporteerde rijen
- `--show-hours`: voeg een **Hours** kolom toe (minuten/60 met 2 decimalen)
- `--csv PAD`: exporteer naar CSV
- `--md PAD`: exporteer naar Markdown-tabel
- `--xlsx PAD`: exporteer naar Excel (vereist `openpyxl`)

### Bestandsnamen & configuratie
- `--output-json PAD`: aangepaste locatie voor JSON (default: `owned_games_{steamid}.json`)
- `--env PAD`: pad naar `.env` bestand (default: `.env` in huidige map)
- `--api-url URL`: volledige API-URL override (normaal uit `.env` opgebouwd)

## Voorbeelden

```bash
# 1) Account 2 gebruiken en top 50 betaalde games tonen
python steam_playtime.py --id 2 --paid-only --top 50

# 2) Print de 30 AppID's met de minste speeltijd voor account 1
python steam_playtime.py --id 1 --bottom-ids 30

# 3) Print met ander scheidingsteken
python steam_playtime.py --bottom-ids 30 --ids-sep "; "

# 4) Toon alleen games met 1–10 minuten speeltijd, oplopend
python steam_playtime.py --min-minutes 1 --max-minutes 10 --sort-asc

# 5) Exporteer top 100 naar CSV en Excel met uren-kolom
python steam_playtime.py --top 100 --show-hours --csv top100.csv --xlsx top100.xlsx

# 6) Eerste keer: verzamel free-to-play info (werkt voor alle accounts!)
python steam_playtime.py --enrich-free-info

# 7) Top 30 minst gespeelde betaalde games van account 3
python steam_playtime.py --id 3 --paid-only --sort-asc --top 30

# 8) Offline modus voor account 1
python steam_playtime.py --offline --id 1 --top 20

# 9) Gebruik een willekeurig Steam ID
python steam_playtime.py --id 76561198033137905 --paid-only
```

## Output voorbeelden

**Console tabel (met `tabulate`)**

```
|   AppID | Game                       |   Minutes |   Hours |
|--------:|----------------------------|----------:|--------:|
|     220 | Half-Life 2                |       182 |    3.03 |
|     300 | Day of Defeat: Source      |       182 |    3.03 |
|      10 | Counter-Strike             |         0 |    0.00 |
```

**ID-lijst (bottom 5)**

```
10, 80, 100, 20, 30
```

## Tip

Wil je het script opnemen in een cronjob of Windows Taakplanner zodat je CSV/Excel altijd actueel is?  
Gebruik gewoon de standaardrun (zonder `--offline`), die haalt elke keer de laatste data op en schrijft uit naar je gewenste bestand(en).

---
Gemaakt voor gebruik in VSCode/terminal. Vragen of extra opties nodig? Laat het weten!
