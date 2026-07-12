from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_live_collaboration_schema(engine: Engine) -> None:
    """Idempotent compatibility migration for installations created before roles."""
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                ALTER TABLE live_collaboration_invitations
                ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'viewer'
                """
            )
        )
