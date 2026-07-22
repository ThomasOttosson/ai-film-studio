"""Add manifest_sha (Genblaze provenance hash) to asset_versions.

Revision ID: 20260722_0003
Revises: 20260722_0002
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260722_0003"
down_revision: Union[str, None] = "20260722_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "asset_versions",
        sa.Column("manifest_sha", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("asset_versions", "manifest_sha")
