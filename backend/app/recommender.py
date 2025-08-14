import pandas as pd
from typing import Optional

df = pd.read_csv("players.csv")

def get_all_players():
    return df.to_dict(orient="records")

def get_top_players(position: Optional[str] = None, top_n: int = 10):
    if position is not None:
        subset = df.loc[df["position"] == position]
    else:
        subset = df
    sorted_subset = subset.sort_values(by="points", ascending=False)
    return sorted_subset.head(top_n).to_dict(orient="records")


# def get_top_players(position=None, top_n=10):
#     subset = df if not position else df[df["position"] == position]
#     return subset.sort_values(by="points", ascending=False).head(top_n).to_dict(orient="records")
