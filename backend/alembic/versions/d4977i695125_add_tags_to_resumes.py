"""add_tags_to_resumes

Revision ID: d4977i695125
Revises: c3866h584014
Create Date: 2026-03-26

Adds tags JSON column to resumes for user-defined resume labels.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd4977i695125'
down_revision = 'c3866h584014'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'resumes',
        sa.Column('tags', sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade():
    op.drop_column('resumes', 'tags')
