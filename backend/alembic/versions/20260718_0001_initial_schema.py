"""Create users and synced study-data tables.

Revision ID: 20260718_0001
Revises:
Create Date: 2026-07-18 15:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "20260718_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("username", sa.String(length=24), nullable=False),
        sa.Column("phone", sa.String(length=11), nullable=True),
        sa.Column("nickname", sa.String(length=16), nullable=False),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "study_data",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("tasks", sa.JSON(), nullable=False),
        sa.Column("review_cards", sa.JSON(), nullable=False),
        sa.Column("checkin_days", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_study_data_user_id", "study_data", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_study_data_user_id", table_name="study_data")
    op.drop_table("study_data")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
