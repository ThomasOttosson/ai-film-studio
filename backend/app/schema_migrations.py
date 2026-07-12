from sqlalchemy import Engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError


def ensure_live_collaboration_schema(engine: Engine) -> None:
    """
    Applies small backwards-compatible schema changes.

    This migration is intentionally idempotent:
    - It does nothing if the table does not exist.
    - It does nothing if the column already exists.
    - It works with both SQLite and PostgreSQL.
    """

    inspector = inspect(engine)
    table_name = "live_collaboration_invitations"

    # The table may not exist yet if create_all() hasn't created it.
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    if "role" in existing_columns:
        return

    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    ALTER TABLE live_collaboration_invitations
                    ADD COLUMN role VARCHAR(20)
                    NOT NULL
                    DEFAULT 'viewer'
                    """
                )
            )

        print(
            "✓ Added 'role' column to "
            "live_collaboration_invitations"
        )

    except SQLAlchemyError as error:
        # Ignore duplicate-column errors that can occur if
        # another process performed the migration first.
        message = str(error).lower()

        if (
            "duplicate column" in message
            or "already exists" in message
        ):
            print(
                "✓ 'role' column already exists."
            )
            return

        raise