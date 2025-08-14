from __future__ import annotations
import os
from . import create_app
from .utils.tasks import start_scheduled_jobs


app = create_app()
start_scheduled_jobs(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)))
