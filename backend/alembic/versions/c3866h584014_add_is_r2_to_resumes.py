"""add_is_r2_to_resumes

Revision ID: c3866h584014
Revises: b2755g473903
Create Date: 2026-03-01

Adds is_r2 boolean column to the resumes table.
- False (default): filepath is a local disk path (old behaviour, preserved)
- True: filepath is a Cloudflare R2 object key
"""
from alembic import op
import sqlalchemy as sa


revision = 'c3866h584014'
down_revision = 'b2755g473903'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'resumes',
        sa.Column('is_r2', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column('resumes', 'is_r2')
