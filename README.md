# Steam Playtime

🇬🇧 **[English version (EN)](README.md)** | 🇳🇱 **[Nederlandse versie (NL)](README_NL.md)**

---

A tool to fetch your **Steam owned games**, store them locally, and sort by **total playtime**.  
Choose between **CLI** (command-line) and **Web Interface** for managing multiple Steam accounts.

## ✨ Features

- **🔐 .env configuration**: API key and multiple Steam accounts in `.env` file
- **👥 Multi-account support**: Manage up to 1000 accounts per machine, or add any Steam ID
- **💾 Central free-to-play cache**: Collected once, shared across all accounts
- **📁 Automatic filenames**: Each account gets its own JSON
- **🌐 Web Interface**: Easy dashboard for account management and data viewing
- **🖥️ CLI tool**: For advanced filtering and exports

## Installation

```bash
# Create virtualenv (optional)
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create a `.env` file:

```ini
# Steam Web API Key (https://steamcommunity.com/dev/apikey)
STEAM_API_KEY=your_api_key

# Standard Steam account IDs (1-3 optional)
STEAM_ID_1=76561198415456165
STEAM_ID_2=76561198033137905
STEAM_ID_3=
```

## Web Interface (recommended)

### Start

```bash
python web_app.py
```

Open your browser at: **http://localhost:5000**

### Features

- **Dashboard**: Overview of your accounts with game count
- **Fetch**: Download latest game data from Steam API
- **View**: Filter and sort games with live filters
- **Settings**: Manage API key and Steam IDs
- **Exports**: Download data as CSV or JSON

### Screenshots

**Dashboard**
- Account cards with game count
- "⬇️ Fetch" button to download data
- Link to "View" for game listing

**Games View**
- Live filters: minutes range, only-zero, etc.
- Table with AppID, Name, Minutes, Hours, Free/Paid status
- Sort by minutes (ascending/descending)

**Settings**
- Secure form for API key and account IDs
- Stored locally, never sent to third parties

---

## CLI Tool (command-line)

For more advanced use with scripts or batch operations.

### Basic usage

```bash
# Account 1 (default)
python steam_playtime.py

# Specific account
python steam_playtime.py --id 1
python steam_playtime.py --id 2
python steam_playtime.py --id 76561198033137905
```

### Filtering

```bash
# Free/paid games (set up once)
python steam_playtime.py --enrich-free-info

# Then:
python steam_playtime.py --id 1 --paid-only --top 30
python steam_playtime.py --id 2 --free-only --sort-asc
```

### Filters

```bash
--min-minutes X      # Minimum playtime in minutes
--max-minutes Y      # Maximum playtime in minutes
--only-zero          # Only games with 0 minutes
--exclude-zero       # All except 0 minutes
--paid-only          # Non-free games only
--free-only          # Free games only
--sort-asc           # Sort ascending (default: descending)
--top N              # Limit to N rows
```

### Exports

```bash
--csv file.csv           # Export to CSV
--md file.md             # Export to Markdown
--xlsx file.xlsx         # Export to Excel
--show-hours             # Add Hours column
```

### ID Lists

```bash
--top-ids 30          # Print top 30 AppIDs
--bottom-ids 30       # Print 30 least played
--ids-sep " | "       # Change separator
```

### Examples

```bash
# Top 20 least played paid games
python steam_playtime.py --id 1 --paid-only --sort-asc --top 20

# Games with 1-10 hours playtime
python steam_playtime.py --id 2 --min-minutes 60 --max-minutes 600

# Export top 100 to Excel
python steam_playtime.py --top 100 --xlsx playtime.xlsx --show-hours

# Offline mode (existing JSON)
python steam_playtime.py --offline --id 1 --top 30

# AppIDs of 50 least played games
python steam_playtime.py --bottom-ids 50 --ids-sep ", "
```

---

## File Structure

```
Steamspul/
├── steam_playtime.py          # CLI tool
├── web_app.py                 # Flask web interface
├── .env                        # Configuration (not in git!)
├── game_free_info.json        # Central free-to-play cache
├── owned_games_*.json         # Per-account game data
├── requirements.txt           # Python dependencies
├── templates/
│   └── index.html            # Web UI
└── static/
    ├── style.css             # Styling
    └── app.js                # JavaScript
```

---

## Behavior & Cache

### Per-account JSON
Each Steam ID gets its own JSON file: `owned_games_{steamid}.json`

### Central Free-to-Play Cache
`game_free_info.json` contains free-to-play status for all games.
- Collected once (can take 2-3 minutes)
- Shared between all accounts
- Automatically updated for new accounts

### Background Scanning
During normal use (without `--paid-only`), new games are scanned in the background.
- Doesn't waste your session time
- Data is stored for next time

---

## Tips

### Get API Key
1. Go to https://steamcommunity.com/dev/apikey
2. Log in with your Steam account
3. Accept the terms
4. Copy your key to `.env`

### Find Steam ID
1. Go to your Steam profile
2. Check the URL: `https://steamcommunity.com/profiles/**76561198xxxxxxxx**`
3. That number is your Steam ID

### Multiple Machines
You can use the same `.env` on multiple machines:
- Game data stays separate (`owned_games_{steamid}.json` per account)
- Free-to-play info (`game_free_info.json`) can be shared

### Automate
Want to fetch data regularly?

**Windows (Task Scheduler):**
```batch
cd C:\path\to\Steamspul
python steam_playtime.py --id 1 --csv games1.csv
```

**Linux/Mac (crontab):**
```bash
0 0 * * * cd ~/Steamspul && python steam_playtime.py --id 1 --csv games1.csv
```

---

## Troubleshooting

**API Key rejected?**
- Check your key is correct at https://steamcommunity.com/dev/apikey
- API key only works for private data (your own account)

**No games fetched?**
- Make sure your Steam ID is correct
- Account must be public (at least: "Friends Only" playtime)
- Check your internet connection

**Free-to-play filtering not working?**
- Run first: `python steam_playtime.py --enrich-free-info`
- This collects free-to-play status for all games

**Web interface won't start?**
- Check: `pip install flask`
- Port 5000 busy? Run: `python web_app.py --port 5001`

---

## License & Privacy

- **Privacy**: All data stays local. API keys are NOT shared.
- **Steam Terms**: Respect [Steam's API ToS](https://steamcommunity.com/dev/apiterms)
- **Free**: Open source project

---

Questions? Issues? Suggestions? Welcome! 🎮
