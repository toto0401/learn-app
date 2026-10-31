from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Settings loaded from environment variables and an optional .env file."""

    PROJECT_NAME: str = "Learn App API"
    API_V1_STR: str = "/api/v1"

    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "my_appLearn"

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    BACKEND_CORS_ORIGINS: str = "*"
    AVATAR_UPLOAD_DIR: Path = BACKEND_DIR / "uploads" / "avatars"
    AVATAR_MAX_SIZE_BYTES: int = 5 * 1024 * 1024

    ALIYUN_ACCESS_KEY_ID: str = ""
    ALIYUN_ACCESS_KEY_SECRET: str = ""
    ALIYUN_DYPNS_ENDPOINT: str = "dypnsapi.aliyuncs.com"
    ALIYUN_SMS_SIGN_NAME: str = ""
    ALIYUN_SMS_TEMPLATE_REGISTER: str = "100001"
    ALIYUN_SMS_TEMPLATE_RESET_PASSWORD: str = "100003"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{password}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            "?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> list[str]:
        if self.BACKEND_CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def uploads_dir(self) -> Path:
        return self.AVATAR_UPLOAD_DIR.parent

    def has_aliyun_sms_credentials(self) -> bool:
        """Return whether all values required for the SMS provider are configured."""

        return all(
            [
                self.ALIYUN_ACCESS_KEY_ID,
                self.ALIYUN_ACCESS_KEY_SECRET,
                self.ALIYUN_SMS_SIGN_NAME,
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
