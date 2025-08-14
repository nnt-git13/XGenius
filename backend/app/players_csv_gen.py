import requests
import pandas as pd
from tqdm import tqdm
import time

# Step 1: Get bootstrap-static
base_url = "https://fantasy.premierleague.com/api/"
data = requests.get(base_url + "bootstrap-static/").json()

players = data["elements"]
teams = {t["id"]: t["name"] for t in data["teams"]}
positions = {p["id"]: p["singular_name"] for p in data["element_types"]}

# Step 2: Process each player
rows = []
for p in tqdm(players):
    player_id = p["id"]
    name = f"{p['first_name']} {p['second_name']}"
    team = teams[p["team"]]
    position = positions[p["element_type"]]
    cost = p["now_cost"] / 10

    try:
        history = requests.get(base_url + f"element-summary/{player_id}/").json()["history"]
        gw_points = [0]*38  # placeholder for GW1-38

        for gw in history:
            gw_index = gw["round"] - 1
            if 0 <= gw_index < 38:
                gw_points[gw_index] = gw["total_points"]

        row = [name, position, team, cost] + gw_points
        rows.append(row)

        time.sleep(0.4)  # prevent rate-limiting
    except:
        continue

# Step 3: Write to CSV
columns = ["Name", "Position", "Team", "Cost"] + [f"GW{i+1}" for i in range(38)]
df = pd.DataFrame(rows, columns=pd.Index(columns))
df.to_csv("fpl_players_gw_data.csv", index=False)
