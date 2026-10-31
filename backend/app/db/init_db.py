from sqlalchemy.engine import Engine


def init_db(engine: Engine) -> None:
    """Deprecated compatibility hook. Run Alembic migrations instead."""

    del engine
