# Steam Playtime

🇬🇧 **[English version (EN)](README.md)** | 🇳🇱 **[Nederlandse versie (NL)](README_NL.md)**

---

Een tool om je **Steam owned games** op te halen, lokaal op te slaan en te sorteren op **totale speeltijd**.  
Keuze tussen **CLI** (commandline) en **Web Interface** voor het beheren van meerdere Steam accounts.

## ✨ Features

- **🔐 .env configuratie**: API key en meerdere Steam accounts in `.env` bestand
- **👥 Multi-account support**: Beheer tot 1000 accounts per machine, of voeg elk Steam ID in
- **💾 Centrale free-to-play cache**: Eenmalig ingezameld, gedeeld tussen alle accounts
- **📁 Automatische bestandsnamen**: Elk account krijgt z'n eigen JSON
- **🌐 Web Interface**: Makkelijk dashboard voor account beheer en data viewing
- **🖥️ CLI tool**: Voor geavanceerde filtering en exports

## Installatie

```bash
# Maak virtualenv (optioneel)
python -m venv .venv
.venv\Scripts\activate

# Installeer dependencies
pip install -r requirements.txt
```

## Configuratie

Maak een `.env` bestand:

```ini
# Steam Web API Key (https://steamcommunity.com/dev/apikey)
STEAM_API_KEY=jouw_api_key

# Standaard Steam account IDs (1-3 optioneel)
STEAM_ID_1=76561198415456165
STEAM_ID_2=76561198033137905
STEAM_ID_3=
```

## Web Interface (aanbevolen)

### Starten

```bash
python web_app.py
```

Open je browser op: **http://localhost:5000**

### Functies

- **Dashboard**: Overzicht van je accounts met game count
- **Ophalen**: Download nieuwste game data van Steam API
- **Bekijken**: Filteren en sorteren van games met live filters
- **Instellingen**: Beheer API key en Steam IDs
- **Exports**: Download data als CSV of JSON

### Screenshots

**Dashboard**
- Account kaarten met game count
- Knop "⬇️ Ophalen" om data op te halen
- Link naar "Bekijken" voor game listing

**Games View**
- Live filters: minuten range, only-zero, etc.
- Tabel met AppID, Name, Minutes, Hours, Free/Paid status
- Sorteren op minuten (op/aflopend)

**Instellingen**
- Veilig formulier voor API key en account IDs
- Lokaal opgeslagen, nooit verzonden naar derden

---

## CLI Tool (command-line)

Voor geavanceerder gebruik met scripts of batch operations.

### Basis gebruik

```bash
# Account 1 (default)
python steam_playtime.py

# Specifiek account
python steam_playtime.py --id 1
python steam_playtime.py --id 2
python steam_playtime.py --id 76561198033137905
```

### Filtering

```bash
# Gratis/betaalde games (eenmalig instellen)
python steam_playtime.py --enrich-free-info

# Daarna:
python steam_playtime.py --id 1 --paid-only --top 30
python steam_playtime.py --id 2 --free-only --sort-asc
```

### Filters

```bash
--min-minutes X      # Minimaal aantal minuten
--max-minutes Y      # Maximaal aantal minuten
--only-zero          # Alleen games met 0 minuten
--exclude-zero       # Alle behalve 0 minuten
--paid-only          # Alleen niet-gratis
--free-only          # Alleen gratis
--sort-asc           # Oplopend sorteren (default: aflopend)
--top N              # Beperk tot N rijen
```

### Exports

```bash
--csv bestand.csv           # Exporteer naar CSV
--md bestand.md             # Exporteer naar Markdown
--xlsx bestand.xlsx         # Exporteer naar Excel
--show-hours                # Voeg Hours kolom toe
```

### ID-lijsten

```bash
--top-ids 30          # Print top 30 AppID's
--bottom-ids 30       # Print 30 minste
--ids-sep " | "       # Wijzig scheidingsteken
```

### Voorbeelden

```bash
# Top 20 minst gespeelde betaalde games
python steam_playtime.py --id 1 --paid-only --sort-asc --top 20

# Games met 1-10 uur speeltijd
python steam_playtime.py --id 2 --min-minutes 60 --max-minutes 600

# Exporteer top 100 naar Excel
python steam_playtime.py --top 100 --xlsx playtime.xlsx --show-hours

# Offline mode (bestaande JSON)
python steam_playtime.py --offline --id 1 --top 30

# AppID's van de 50 minst gespeelde games
python steam_playtime.py --bottom-ids 50 --ids-sep ", "
```

---

## Bestandsstructuur

```
Steamspul/
├── steam_playtime.py          # CLI tool
├── web_app.py                 # Flask web interface
├── .env                        # Configuratie (niet in git!)
├── game_free_info.json        # Centrale free-to-play cache
├── owned_games_*.json         # Per-account game data
├── requirements.txt           # Python dependencies
├── templates/
│   └── index.html            # Web UI
└── static/
    ├── style.css             # Styling
    └── app.js                # JavaScript
```

---

## Gedrag & Cache

### Per-account JSON
Elk Steam ID krijgt z'n eigen JSON bestand: `owned_games_{steamid}.json`

### Centrale Free-to-Play Cache
`game_free_info.json` bevat free-to-play status voor alle games.
- Eenmalig ingezameld (kan 2-3 minuten duren)
- Wordt gedeeld tussen alle accounts
- Automatisch bijgewerkt bij nieuwe accounts

### Achtergrond Scanning
Bij normaal gebruik (zonder `--paid-only`) worden nieuwe games op de achtergrond gescand.
- Verspilt geen tijd van je huidige sessie
- Data wordt opgeslagen voor volgende keer

---

## Tips

### API Key Ophalen
1. Ga naar https://steamcommunity.com/dev/apikey
2. Log in met je Steam account
3. Accepteer de voorwaarden
4. Kopieer je key naar `.env`

### Steam ID Vinden
1. Ga naar je Steam profiel
2. Kijk naar de URL: `https://steamcommunity.com/profiles/**76561198xxxxxxxx**`
3. Dit getal is je Steam ID

### Meerdere Machines
Je kunt dezelfde `.env` gebruiken op meerdere machines:
- Game data blijft gescheiden (`owned_games_{steamid}.json` per account)
- Free-to-play info (`game_free_info.json`) kan gedeeld worden

### Automatiseren
Wil je data regelmatig ophalen?

**Windows (Taakplanner):**
```batch
cd C:\pad\naar\Steamspul
python steam_playtime.py --id 1 --csv games1.csv
```

**Linux/Mac (crontab):**
```bash
0 0 * * * cd ~/Steamspul && python steam_playtime.py --id 1 --csv games1.csv
```

---

## Troubleshooting

**API Key geweigerd?**
- Check of je key correct is op https://steamcommunity.com/dev/apikey
- API key werkt alleen voor private data (je eigen account)

**Geen games opgehaald?**
- Zorg dat je Steam ID correct is
- Account moet public zijn (minstens: "Friends Only" speeluren)
- Check je internet verbinding

**Free-to-play filtering werkt niet?**
- Run eerst: `python steam_playtime.py --enrich-free-info`
- Dit verzamelt free-to-play status voor alle games

**Web interface start niet?**
- Check: `pip install flask`
- Poort 5000 bezet? Run: `python web_app.py --port 5001`

---

## Licentie & Privacy

- **Privacy**: Alle data blijft lokaal. API keys worden NIET gedeeld.
- **Steam Terms**: Respecteer [Steam's API ToS](https://steamcommunity.com/dev/apiterms)
- **Gratis**: Open source project

---

Vragen? Issues? Suggestions? Welkom! 🎮
