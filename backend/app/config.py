from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    waha_base_url: str = "http://waha:3000"
    waha_api_key: str = ""
    waha_session_name: str = "default"
    poll_interval_minutes: int = 15
    database_path: str = "/data/wa_tracker.db"
    auth_token: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
