"""Add synchronized review-study time.

Revision ID: 20260718_0002
Revises: 20260718_0001
Create Date: 2026-07-18 17:10:00
"""
from alembic import op
import sqlalchemy as sa


revision = "20260718_0002"
down_revision = "20260718_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "study_data",
        sa.Column("review_seconds", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("study_data", "review_seconds")
