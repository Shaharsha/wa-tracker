import os
import tempfile
import uuid

import pytest

# Set defaults before any app imports
os.environ.setdefault("WAHA_API_KEY", "test-key")
os.environ.setdefault("AUTH_TOKEN", "test-token")
os.environ.setdefault("WAHA_BASE_URL", "http://localhost:3000")
os.environ.setdefault("DASHBOARD_USERNAME", "admin")
os.environ.setdefault("DASHBOARD_PASSWORD", "test-password")
os.environ.setdefault("DATABASE_PATH", os.path.join(tempfile.gettempdir(), "test_wa.db"))


@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    """Give each test its own SQLite database for parallel safety."""
    db_path = os.path.join(tempfile.gettempdir(), f"test_wa_{uuid.uuid4().hex[:8]}.db")
    monkeypatch.setenv("DATABASE_PATH", db_path)

    # Also patch the settings object directly since it may already be imported
    from app.config import settings
    monkeypatch.setattr(settings, "database_path", db_path)

    yield db_path

    for suffix in ("", "-wal", "-shm"):
        try:
            os.unlink(db_path + suffix)
        except FileNotFoundError:
            pass
