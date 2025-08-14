import random

def predict_points(player_names: list[str]):
    return {name: round(random.uniform(2.0, 12.0), 2) for name in player_names}
