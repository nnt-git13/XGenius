from __future__ import annotations
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error
from .. ..config import Config


FEATURES_NUM = ["minutes", "xg", "xa", "shots", "key_passes"]
FEATURES_CAT = ["position", "team"]
TARGET = "points"


def build_pipeline(alpha: float = 1.5) -> Pipeline:
    pre = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), FEATURES_NUM),
            ("cat", OneHotEncoder(handle_unknown="ignore"), FEATURES_CAT),
        ]
    )
    model = Ridge(alpha=alpha, random_state=42)
    pipe = Pipeline(steps=[("pre", pre), ("model", model)])
    return pipe


def train_on_folder(data_dir: str, out_path: str) -> dict:
    frames = []
    for root, _, files in os.walk(data_dir):
        for f in files:
            if f.endswith(".csv"):
                frames.append(pd.read_csv(os.path.join(root, f)))
    if not frames:
        raise FileNotFoundError("No CSVs found for historical training")
    df = pd.concat(frames, ignore_index=True)
    df = df.dropna(subset=[TARGET])

    X = df[FEATURES_NUM + FEATURES_CAT]
    y = df[TARGET]

    pipe = build_pipeline()
    pipe.fit(X, y)

    preds = pipe.predict(X)
    rmse = float(np.sqrt(mean_squared_error(y, preds)))

    joblib.dump({"model": pipe, "rmse": rmse}, out_path)
    return {"rmse": rmse, "n": int(len(df))}


def load_model(path: str):
    blob = joblib.load(path)
    return blob["model"], blob.get("rmse", None)
