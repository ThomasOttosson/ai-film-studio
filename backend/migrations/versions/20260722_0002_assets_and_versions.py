"""Add assets and asset_versions tables for versioned provenance.

Revision ID: 20260722_0002
Revises: 20260713_0001
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260722_0002"
down_revision: Union[str, None] = "20260713_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(length=80), nullable=False),
        sa.Column("scene_id", sa.String(length=80), nullable=True),
        sa.Column("asset_type", sa.String(length=20), nullable=False),
        sa.Column("current_version_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"], ["projects.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "scene_id", "asset_type", name="uq_asset_scope"
        ),
    )
    op.create_index(
        op.f("ix_assets_project_id"), "assets", ["project_id"], unique=False
    )

    op.create_table(
        "asset_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("b2_key", sa.String(length=1024), nullable=False),
        sa.Column("b2_url", sa.String(length=2048), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["asset_id"], ["assets.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_asset_versions_asset_id"),
        "asset_versions",
        ["asset_id"],
        unique=False,
    )

    # Circular FK: assets.current_version_id -> asset_versions.id. Added after
    # both tables exist to break the dependency cycle.
    op.create_foreign_key(
        "fk_assets_current_version",
        "assets",
        "asset_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_assets_current_version", "assets", type_="foreignkey"
    )
    op.drop_index(
        op.f("ix_asset_versions_asset_id"), table_name="asset_versions"
    )
    op.drop_table("asset_versions")
    op.drop_index(op.f("ix_assets_project_id"), table_name="assets")
    op.drop_table("assets")
