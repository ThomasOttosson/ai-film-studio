from __future__ import annotations

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine

ALEMBIC_CONFIG = "alembic.ini"
INITIAL_REVISION = "20260713_0001"


def run_migrations() -> None:
    config = Config(ALEMBIC_CONFIG)
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    application_tables = table_names - {"alembic_version"}
    has_alembic_version = "alembic_version" in table_names

    if application_tables and not has_alembic_version:
        command.stamp(config, INITIAL_REVISION)
        print(
            "Existing database detected. "
            f"Stamped Alembic revision {INITIAL_REVISION}."
        )

    command.upgrade(config, "head")
    print("Database migrations are up to date.")


if __name__ == "__main__":
    run_migrations()