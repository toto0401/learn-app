from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect


def test_initial_migration_builds_schema(tmp_path: Path):
    database_path = tmp_path / "migration.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")

    command.upgrade(config, "head")

    from sqlalchemy import create_engine

    engine = create_engine(f"sqlite:///{database_path}")
    inspector = inspect(engine)
    assert {"users", "study_data", "alembic_version"} <= set(inspector.get_table_names())
    assert {"username", "phone", "avatar_url"} <= {
        column["name"] for column in inspector.get_columns("users")
    }
    assert {"user_id", "tasks", "review_cards", "checkin_days", "review_seconds"} <= {
        column["name"] for column in inspector.get_columns("study_data")
    }
    engine.dispose()
