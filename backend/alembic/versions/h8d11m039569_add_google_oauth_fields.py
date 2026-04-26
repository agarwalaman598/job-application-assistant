"""add_google_oauth_fields

Revision ID: h8d11m039569
Revises: g7c00l928458
Create Date: 2026-04-26

Make users.hashed_password nullable for OAuth-only users and add Google auth fields.
"""
from alembic import op
import sqlalchemy as sa


revision = 'h8d11m039569'
down_revision = 'g7c00l928458'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=True)
    op.add_column('users', sa.Column('google_id', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('auth_provider', sa.String(length=20), nullable=False, server_default='local'))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'google_id')
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=False)
