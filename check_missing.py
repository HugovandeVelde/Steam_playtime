import json
from pathlib import Path

# Load all owned games
all_appids = set()
data_dir = Path('.')

for file in data_dir.glob('owned_games_*.json'):
    try:
        with open(file, 'r', encoding='utf-8', errors='replace') as f:
            data = json.load(f)
            # Handle both direct list and response.games structure
            if isinstance(data, dict) and 'response' in data:
                games = data['response'].get('games', [])
            else:
                games = data if isinstance(data, list) else []

            for game in games:
                all_appids.add(str(game['appid']))
    except Exception as e:
        print(f"Error reading {file}: {e}")

# Load game_free_info
with open('game_free_info.json', 'r') as f:
    game_free_info = json.load(f)

# Find games not in game_free_info
missing = all_appids - set(game_free_info.keys())
print(f'Total owned games: {len(all_appids)}')
print(f'Games in game_free_info: {len(game_free_info)}')
print(f'Games NOT in game_free_info: {len(missing)}')

# Count null values
nulls = sum(1 for v in game_free_info.values() if v is None)
print(f'Games with null value: {nulls}')
print(f'Total untested (missing + nulls): {len(missing) + nulls}')

# .
