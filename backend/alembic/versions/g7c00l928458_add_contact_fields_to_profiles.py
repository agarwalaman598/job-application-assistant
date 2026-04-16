"""add_contact_fields_to_profiles

Revision ID: g7c00l928458
Revises: f6b99k817347
Create Date: 2026-04-17

Add contact_fields JSON column to profiles for dynamic profile contact rows.
"""
from alembic import op
import sqlalchemy as sa


revision = 'g7c00l928458'
down_revision = 'f6b99k817347'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('profiles', sa.Column('contact_fields', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('profiles', 'contact_fields')
