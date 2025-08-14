from __future__ import annotations
import os
import pandas as pd
from .pipeline import FEATURES_NUM, FEATURES_CAT, load_model


def predict_points(model_path: str, df: pd.DataFrame):
    model, rmse = load_model(model_path)
    X = df[FEATURES_NUM + FEATURES_CAT]
    preds = model.predict(X)
    return preds, rmse
