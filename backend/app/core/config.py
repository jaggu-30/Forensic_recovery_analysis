from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "RECOVERAI Backend"
    app_version: str = "1.0.0"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'recoverai.db'}"
    upload_dir: str = str(BACKEND_DIR / "storage" / "evidence")
    recovered_dir: str = str(BACKEND_DIR / "storage" / "recovered")
    benchmark_dir: str = str(PROJECT_DIR / "data" / "benchmark")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
