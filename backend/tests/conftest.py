import os
import tempfile

import pytest

os.environ["DATABASE_PATH"] = os.path.join(tempfile.gettempdir(), "test_wa_tracker.db")
os.environ["WAHA_API_KEY"] = "test-key"
os.environ["AUTH_TOKEN"] = "test-token"
os.environ["WAHA_BASE_URL"] = "http://localhost:3000"


@pytest.fixture(autouse=True)
def clean_db():
    db_path = os.environ["DATABASE_PATH"]
    yield
    for suffix in ("", "-wal", "-shm"):
        try:
            os.unlink(db_path + suffix)
        except FileNotFoundError:
            pass
