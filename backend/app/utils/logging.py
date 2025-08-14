import logging
from logging.handlers import RotatingFileHandler
import os


def configure_logging(app):
    log_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(log_dir, exist_ok=True)

    handler = RotatingFileHandler(os.path.join(log_dir, "app.log"), maxBytes=5_000_000, backupCount=3)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    handler.setFormatter(formatter)

    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
